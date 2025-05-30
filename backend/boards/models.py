from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

class Board(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='boards')
    members = models.ManyToManyField(User, related_name='shared_boards', blank=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

class List(models.Model):
    title = models.CharField(max_length=200)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='lists')
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
        unique_together = ['board', 'position']

    def __str__(self):
        return f"{self.title} - {self.board.title}"

    def save(self, *args, **kwargs):
        if not self.position:
            # If no position is set, put it at the end
            last_position = List.objects.filter(board=self.board).aggregate(
                models.Max('position'))['position__max']
            self.position = (last_position or 0) + 1
        super().save(*args, **kwargs)

class Card(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    list = models.ForeignKey(List, on_delete=models.CASCADE, related_name='cards')
    position = models.PositiveIntegerField(default=0)
    due_date = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cards')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_cards')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
        unique_together = ['list', 'position']

    def __str__(self):
        return f"{self.title} - {self.list.title}"

    def save(self, *args, **kwargs):
        if not self.position:
            # If no position is set, put it at the end
            last_position = Card.objects.filter(list=self.list).aggregate(
                models.Max('position'))['position__max']
            self.position = (last_position or 0) + 1
        
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Broadcast the update
        self.broadcast_update(is_new)

    def delete(self, *args, **kwargs):
        # Store the ID before deletion
        card_id = self.pk
        board_id = self.list.board.id
        super().delete(*args, **kwargs)
        
        # Broadcast the deletion
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'board_{board_id}',
            {
                'type': 'card_delete',
                'card_id': card_id
            }
        )

    def broadcast_update(self, is_new=False):
        channel_layer = get_channel_layer()
        board_id = self.list.board.id
        
        # Prepare the card data
        card_data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'list_id': self.list.id,
            'position': self.position,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'priority': self.priority,
            'assigned_to': self.assigned_to.id if self.assigned_to else None,
            'created_by': self.created_by.id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

        # Broadcast to the board group
        async_to_sync(channel_layer.group_send)(
            f'board_{board_id}',
            {
                'type': 'card_create' if is_new else 'card_update',
                'card': card_data
            }
        )

        # Also broadcast to the specific card group
        async_to_sync(channel_layer.group_send)(
            f'card_{self.id}',
            {
                'type': 'card_create' if is_new else 'card_update',
                'card': card_data
            }
        )
