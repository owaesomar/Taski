from rest_framework import serializers
from .models import Board, List, Card
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class CardSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Card
        fields = ['id', 'title', 'description', 'list', 'position', 'due_date', 
                 'priority', 'assigned_to', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class ListSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = List
        fields = ['id', 'title', 'board', 'position', 'cards', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class BoardSerializer(serializers.ModelSerializer):
    lists = ListSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = ['id', 'title', 'description', 'owner', 'members', 'lists', 
                 'created_at', 'updated_at']
        read_only_fields = ['owner', 'created_at', 'updated_at']
