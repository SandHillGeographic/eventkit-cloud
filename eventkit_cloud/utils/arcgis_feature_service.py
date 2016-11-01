from __future__ import absolute_import

import logging
import os
import subprocess
from string import Template

logger = logging.getLogger(__name__)


class ArcGISFeatureServiceToGPKG(object):

    """
    Convert a Arcgis Feature Service to a gpkg file.
    """


    def __init__(self, config=None, gpkg=None, bbox=None, service_url=None, layer=None, debug=None, name=None, service_type=None):

        """
        Initialize the ArcFeatureServiceToGPKG utility.

        Args:
            gpkg: where to write the gpkg output
            debug: turn debugging on / off
        """
        self.gpkg = gpkg
        self.bbox = bbox
        self.service_url = service_url
        self.debug = debug
        self.name = name
        self.layer = layer
        self.config = config
        if self.bbox:
            self.cmd = Template("ogr2ogr -progress -skipfailures -t_srs EPSG:3857 -spat_srs EPSG:4326 -spat $minX $minY $maxX $maxY -f GPKG $gpkg '$url'")
        else:
            self.cmd = Template("ogr2ogr -progress -skipfailures -t_srs EPSG:3857 -f GPKG $gpkg '$url'")

    def convert(self, ):
        """
        Convert Arc Feature Service to gpkg.
        """
        if not os.path.exists(os.path.dirname(self.gpkg)):
            os.makedirs(os.path.dirname(self.gpkg), 6600)

        try:
            # remove any url query so we can add our own
            self.service_url = self.service_url.split('/query?')[0]
        except ValueError:
            # if no url query we can just check for trailing slash and move on
            self.service_url = self.service_url.rstrip('/\\')
        finally:
            self.service_url = '{}{}'.format(self.service_url, '/query?where=objectid%3Dobjectid&outfields=*&f=json')

        if self.bbox:
            convert_cmd = self.cmd.safe_substitute({'gpkg': self.gpkg, 'url': self.service_url, 'minX': self.bbox[0], 'minY': self.bbox[1], 'maxX': self.bbox[2], 'maxY': self.bbox[3]})
        else:
            convert_cmd = self.cmd.safe_substitute({'gpkg': self.gpkg, 'url': self.service_url})

        if self.debug:
            logger.debug('Running: %s' % convert_cmd)

        proc = subprocess.Popen(convert_cmd, shell=True, executable='/bin/sh',
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        (stdout, stderr) = proc.communicate()
        returncode = proc.wait()

        if returncode != 0:
            logger.error('%s', stderr)
            raise Exception, "ogr2ogr process failed with returncode {0}".format(returncode)
        if self.debug:
            logger.debug('ogr2ogr returned: %s' % returncode)

        return self.gpkg
