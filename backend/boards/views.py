from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Board, List, Card
from .serializers import BoardSerializer, ListSerializer, CardSerializer
from django.contrib.auth.models import User

class IsOwnerOrMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Board):
            return obj.owner == request.user or request.user in obj.members.all()
        elif isinstance(obj, List):
            return obj.board.owner == request.user or request.user in obj.board.members.all()
        elif isinstance(obj, Card):
            return obj.list.board.owner == request.user or request.user in obj.list.board.members.all()
        return False

class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsOwnerOrMember()]

    def get_queryset(self):
        return Board.objects.filter(owner=self.request.user) | Board.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        board = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            board.members.add(user)
            return Response({'status': 'member added'})
        except User.DoesNotExist:
            return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)

class ListViewSet(viewsets.ModelViewSet):
    serializer_class = ListSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]

    def get_queryset(self):
        return List.objects.filter(board__owner=self.request.user) | List.objects.filter(board__members=self.request.user)

    def perform_create(self, serializer):
        board_id = self.request.data.get('board')
        board = get_object_or_404(Board, id=board_id)
        if board.owner != self.request.user and self.request.user not in board.members.all():
            raise permissions.PermissionDenied("You don't have permission to add lists to this board")
        serializer.save()

class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrMember]

    def get_queryset(self):
        return Card.objects.filter(list__board__owner=self.request.user) | Card.objects.filter(list__board__members=self.request.user)

    def perform_create(self, serializer):
        list_id = self.request.data.get('list')
        list_obj = get_object_or_404(List, id=list_id)
        if list_obj.board.owner != self.request.user and self.request.user not in list_obj.board.members.all():
            raise permissions.PermissionDenied("You don't have permission to add cards to this list")
        serializer.save(created_by=self.request.user)
