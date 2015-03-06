# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import swampdragon.models
import model_utils.fields
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Track',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, verbose_name='created', editable=False)),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, verbose_name='modified', editable=False)),
                ('service_id', models.CharField(unique=True, max_length=255)),
                ('title', models.CharField(max_length=255)),
                ('artist', models.CharField(max_length=255)),
                ('now_playing', models.BooleanField(default=False)),
                ('on_queue', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Track',
            },
            bases=(swampdragon.models.SelfPublishModel, models.Model),
        ),
        migrations.CreateModel(
            name='Vote',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, verbose_name='created', editable=False)),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, verbose_name='modified', editable=False)),
                ('token', models.CharField(max_length=255)),
                ('track', models.ForeignKey(related_name='votes', to='tracks.Track')),
            ],
            options={
                'verbose_name': 'Vote',
            },
            bases=(swampdragon.models.SelfPublishModel, models.Model),
        ),
        migrations.AlterUniqueTogether(
            name='vote',
            unique_together=set([('track', 'token')]),
        ),
    ]
