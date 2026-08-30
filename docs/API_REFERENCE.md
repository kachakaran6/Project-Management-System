# REST & Real-Time API Reference

## Socket.io Event Catalog

### Inbound Events (Client -> Server)
- `join:workspace` - Join a workspace room `(workspaceId: string)`.
- `leave:workspace` - Leave a workspace room.
- `board:cursor_move` - Broadcast live mouse coordinate `({ x, y, user })`.
- `task:drag_start` - Lock task card while dragged by active user.

### Outbound Events (Server -> Client)
- `board:updated` - Payload containing changed column order or card delta.
- `notification:new` - Real-time push alert for mentions or assignment.
- `member:presence` - Active user list update for current room.

## Rate Limiting Standards
- Unauthenticated endpoints: 60 requests per 15 minutes per IP.
- Authenticated read endpoints: 1,200 requests per minute.
- Bulk write endpoints: 300 requests per minute.
