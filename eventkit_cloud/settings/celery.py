# -*- coding: utf-8 -*-
import json
import os
from celery.schedules import crontab

from eventkit_cloud.celery import app
from eventkit_cloud.settings.contrib import *  # NOQA

# Celery config
CELERY_TRACK_STARTED = True

"""
 IMPORTANT

 Don't propagate exceptions in the celery chord header to the finalize task.
 If exceptions are thrown in the chord header then allow the
 finalize task to collect the results and update the overall run state.

"""
# CELERY_CHORD_PROPAGATES = False

CELERYD_PREFETCH_MULTIPLIER = 1
CELERYBEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "rpc://")

# Pickle used to be the default, and accepting pickled content is a security concern.  Using the new default json,
# causes a circular reference error, that will need to be resolved.
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
# configure periodic task

BEAT_SCHEDULE = {
    "expire-runs": {"task": "Expire Runs", "schedule": crontab(minute="0", hour="0")},
    "provider-statuses": {
        "task": "Check Provider Availability",
        "schedule": crontab(minute="*/{}".format(os.getenv("PROVIDER_CHECK_INTERVAL", "30"))),
    },
    "clean-up-queues": {"task": "Clean Up Queues", "schedule": crontab(minute="0", hour="0")},
    "clear-tile-cache": {"task": "Clear Tile Cache", "schedule": crontab(minute="0", day_of_month="*/14")},
    "clear-user-sessions": {"task": "Clear User Sessions", "schedule": crontab(minute="0", day_of_month="*/2")},
    "update-statistics-cache": {
        "task": "Update Statistics Caches",
        "schedule": crontab(minute="0", day_of_month="*/4"),
    },
}

PCF_SCALING = os.getenv("PCF_SCALING", False)
if PCF_SCALING:
    BEAT_SCHEDULE.update(
        {
            "pcf-scale-celery": {
                "task": "PCF Scale Celery",
                "schedule": 60.0,
                "kwargs": {"max_tasks_memory": int(os.getenv("CELERY_MAX_TASKS_MEMORY", 20000))},
                "options": {"priority": 90, "queue": "scale", "routing_key": "scale"},
            },
        }
    )

app.conf.beat_schedule = BEAT_SCHEDULE

CELERYD_USER = CELERYD_GROUP = "eventkit"
if os.getenv("VCAP_SERVICES"):
    CELERYD_USER = CELERYD_GROUP = "vcap"
CELERYD_USER = os.getenv("CELERYD_USER", CELERYD_USER)
CELERYD_GROUP = os.getenv("CELERYD_GROUP", CELERYD_GROUP)

BROKER_URL = None
if os.getenv("VCAP_SERVICES"):
    for service, listings in json.loads(os.getenv("VCAP_SERVICES")).items():
        try:
            if "rabbitmq" in service:
                BROKER_URL = listings[0]["credentials"]["protocols"]["amqp"]["uri"]
            if "cloudamqp" in service:
                BROKER_URL = listings[0]["credentials"]["uri"]
        except KeyError:
            continue
        if BROKER_URL:
            break
if not BROKER_URL:
    BROKER_URL = os.environ.get("BROKER_URL", "amqp://guest:guest@localhost:5672//")

BROKER_API_URL = None
if os.getenv("VCAP_SERVICES"):
    for service, listings in json.loads(os.getenv("VCAP_SERVICES")).items():
        try:
            if "rabbitmq" in service:
                BROKER_API_URL = listings[0]["credentials"]["http_api_uri"]
            if "cloudamqp" in service:
                BROKER_API_URL = listings[0]["credentials"]["http_api_uri"]
        except KeyError:
            continue
        if BROKER_API_URL:
            break
if not BROKER_API_URL:
    BROKER_API_URL = os.environ.get("BROKER_API_URL", "http://guest:guest@localhost:15672/api/")

MAX_TASK_ATTEMPTS = int(os.getenv("MAX_TASK_ATTEMPTS", 3))

app.conf.task_soft_time_limit = int(os.getenv("TASK_TIMEOUT", 0)) or None
