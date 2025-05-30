import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Card, List, Board
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            try:
                # Verify the token and get the user
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                scope['user'] = await database_sync_to_async(User.objects.get)(id=user_id)
            except Exception as e:
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

class CardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f'board_{self.board_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get('action')
        
        if action == 'subscribe':
            # Handle subscription to specific card updates
            card_id = text_data_json.get('card_id')
            if card_id:
                await self.channel_layer.group_add(
                    f'card_{card_id}',
                    self.channel_name
                )
        elif action == 'unsubscribe':
            # Handle unsubscription from specific card updates
            card_id = text_data_json.get('card_id')
            if card_id:
                await self.channel_layer.group_discard(
                    f'card_{card_id}',
                    self.channel_name
                )

    async def card_update(self, event):
        # Send card update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'card_update',
            'card': event['card']
        }))

    async def card_create(self, event):
        # Send card creation to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'card_create',
            'card': event['card']
        }))

    async def card_delete(self, event):
        # Send card deletion to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'card_delete',
            'card_id': event['card_id']
        }))

class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f'board_{self.board_id}'

        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close()
            return

        try:
            # Verify user has access to the board
            board = await self.get_board()
            if not board:
                await self.close()
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            print(f"WebSocket connected for board {self.board_id}")
        except Exception as e:
            print(f"Error in WebSocket connect: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"WebSocket disconnected from board {self.board_id}")
        except Exception as e:
            print(f"Error in WebSocket disconnect: {str(e)}")

    @database_sync_to_async
    def get_board(self):
        try:
            return Board.objects.get(id=self.board_id)
        except Board.DoesNotExist:
            return None

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'board_message',
                    'message': message
                }
            )
        except Exception as e:
            print(f"Error in WebSocket receive: {str(e)}")

    async def board_message(self, event):
        try:
            message = event['message']

            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'message': message
            }))
        except Exception as e:
            print(f"Error in WebSocket board_message: {str(e)}")

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner)) 