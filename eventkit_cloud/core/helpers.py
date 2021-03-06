# -*- coding: utf-8 -*-
import logging
import os
import shutil
import subprocess
import zipfile
from enum import Enum
from functools import wraps
from typing import Type

import requests_pkcs12
from django.db import models

import dj_database_url
import requests
from django.conf import settings
from django.core.cache import cache
from notifications.signals import notify
from django.contrib.auth.models import User

from eventkit_cloud.utils import auth_requests

logger = logging.getLogger(__name__)


def get_id(user: User):
    if hasattr(user, "oauth"):
        return user.oauth.identification
    else:
        return user.username


def get_model_by_params(model_class: models.Model, **kwargs):
    return model_class.objects.get(**kwargs)


def get_cached_model(model: Type[models.Model], prop: str, value: str) -> Type[models.Model]:
    return cache.get_or_set(f"{model.__name__}-{prop}-{value}", get_model_by_params(model, **{prop: value}), 360)


def download_file(url, download_dir=None):
    from eventkit_cloud.tasks.helpers import normalize_name

    download_dir = download_dir or settings.EXPORT_STAGING_ROOT
    file_location = os.path.join(download_dir, normalize_name(os.path.basename(url)))
    r = requests.get(url, stream=True)
    if r.status_code == 200:
        with open(file_location, "wb") as f:
            for chunk in r:
                f.write(chunk)
        return file_location
    else:
        logger.error("Failed to download file, STATUS_CODE: {0}".format(r.status_code))
    return None


def extract_zip(zipfile_path, extract_dir=None):
    extract_dir = extract_dir or settings.EXPORT_STAGING_ROOT

    logger.info("Extracting {0} to {1}...".format(zipfile_path, extract_dir))

    zip_ref = zipfile.ZipFile(zipfile_path, "r")
    zip_ref.extractall(extract_dir)
    logger.info("Finished Extracting.")
    zip_ref.close()
    return extract_dir


def get_vector_file(directory):
    for file in os.listdir(directory):
        if file.endswith((".shp", ".geojson", ".gpkg")):
            logger.info("Found: {0}".format(file))
            return os.path.join(directory, file)


def load_land_vectors(db_conn=None, url=None):
    if not url:
        url = settings.LAND_DATA_URL

    if db_conn:
        database = dj_database_url.config(default=db_conn)
    else:
        database = settings.DATABASES["feature_data"]

    logger.info("Downloading land data: {0}".format(url))
    download_filename = download_file(url)
    logger.info("Finished downloading land data: {0}".format(url))

    file_dir = None
    if os.path.splitext(download_filename)[1] == ".zip":
        extract_zip(download_filename)
        file_dir = os.path.splitext(download_filename)[0]
        file_name = get_vector_file(file_dir)
    else:
        file_name = download_filename

    cmd = (
        'ogr2ogr -s_srs EPSG:3857 -t_srs EPSG:4326 -f "PostgreSQL" '
        'PG:"host={host} user={user} password={password} dbname={name} port={port}" '
        "{file} land_polygons".format(
            host=database["HOST"],
            user=database["USER"],
            password=database["PASSWORD"].replace("$", "\$"),
            name=database["NAME"],
            port=database["PORT"],
            file=file_name,
        )
    )
    logger.info("Loading land data...")
    exit_code = subprocess.call(cmd, shell=True)

    if exit_code:
        logger.error("There was an error importing the land data.")

    if file_dir:
        shutil.rmtree(file_dir)
    os.remove(download_filename)
    try:
        os.remove(file_name)
    except OSError:
        pass
    finally:
        logger.info("Finished loading land data.")


def handle_auth(func):
    """
    Decorator for requests methods that supplies username and password as HTTPBasicAuth header.
    Checks first for credentials environment variable, then URL, and finally kwarg parameters.
    :param func: A requests method that returns an instance of requests.models.Response
    :return: result of requests function call
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            cert_path, cert_pass = auth_requests.get_cert_info(kwargs)
            kwargs["cert_path"] = cert_path
            kwargs["cert_pass"] = cert_pass
            cred_var = kwargs.pop("cred_var", None) or kwargs.pop("slug", None)
            url = kwargs.get("url")
            cred = auth_requests.get_cred(cred_var=cred_var, url=url, params=kwargs.get("params", None))
            if cred:
                kwargs["username"] = cred[0]
                kwargs["password"] = cred[1]
            logger.debug(
                "requests.%s('%s', %s)", func.__name__, url, ", ".join(["%s=%s" % (k, v) for k, v in kwargs.items()])
            )
            response = func(*args, **kwargs)
            return response
        except Exception:
            raise

    return wrapper


@handle_auth
def get_or_update_session(session=None, max_retries=3, headers=None, **auth_info):
    username = auth_info.get("username")
    password = auth_info.get("password")
    cert_path = auth_info.get("cert_path")
    cert_pass = auth_info.get("cert_pass")
    ssl_verify = getattr(settings, "SSL_VERIFICATION", True)

    if not session:
        session = requests.Session()

    if username and password:
        logger.debug(f"setting {username} and {password} for session")
        session.auth = (username, password)
        adapter = requests.adapters.HTTPAdapter(max_retries=max_retries)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

    if cert_path and cert_pass:
        try:
            adapter = requests_pkcs12.Pkcs12Adapter(
                pkcs12_filename=cert_path, pkcs12_password=cert_pass, max_retries=max_retries,
            )
            session.mount("https://", adapter)
        except FileNotFoundError:
            logger.error("No cert found at path {}".format(cert_path))

    logger.debug("Using %s for SSL verification.", str(ssl_verify))
    session.verify = ssl_verify
    session.headers = headers or {}
    return session


class NotificationLevel(Enum):
    SUCCESS = "success"
    INFO = "info"
    WARNING = "warning"
    ERROR = "ERROR"


class NotificationVerb(Enum):
    RUN_STARTED = "run_started"
    RUN_COMPLETED = "run_completed"
    RUN_FAILED = "run_failed"
    RUN_DELETED = "run_deleted"
    RUN_CANCELED = "run_canceled"
    REMOVED_FROM_GROUP = "removed_from_group"
    ADDED_TO_GROUP = "added_to_group"
    SET_AS_GROUP_ADMIN = "set_as_group_admin"
    REMOVED_AS_GROUP_ADMIN = "removed_as_group_admin"
    RUN_EXPIRING = "run_expiring"


def sendnotification(actor, recipient, verb, action_object, target, level, description):
    try:
        notify.send(
            actor,
            recipient=recipient,
            verb=verb,
            action_object=action_object,
            target=target,
            level=level,
            description=description,
        )
    except Exception as err:
        logger.debug("notify send error ignored: %s" % err)
