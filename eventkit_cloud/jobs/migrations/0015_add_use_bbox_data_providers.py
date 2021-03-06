# Generated by Django 3.1.2 on 2021-05-04 14:00
from django.db import migrations

class Migration(migrations.Migration):

    def set_use_bbox(apps, schema_editor):
        DataProviderType = apps.get_model('jobs', 'DataProviderType')
        # Data provider types that can only fetch data from bbox
        bbox_data_provider_types = ['osm', 'wcs', 'wfs', 'arcgis-feature']
        # Set use bbox on all provider types
        DataProviderType.objects.filter(type_name__in=bbox_data_provider_types).update(use_bbox=True)

    def unset_use_bbox(apps, schema_editor):
        DataProviderType = apps.get_model('jobs', 'DataProviderType')
        DataProviderType.objects.all().update(use_bbox=False)

    dependencies = [
        ('jobs', '0014_dataprovidertype_use_bbox'),
    ]

    operations = [
        migrations.RunPython(set_use_bbox, unset_use_bbox),
    ]
