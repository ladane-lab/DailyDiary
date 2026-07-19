# DailyDiary High-Level Design (HLD)

The following diagram illustrates the architecture and data flow of the DailyDiary platform, incorporating the recent performance and caching optimizations.

```mermaid
graph TD
    %% Define styles
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef database fill:#8b5cf6,stroke:#5b21b6,stroke-width:2px,color:#fff;
    classDef external fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;

    %% Nodes
    Client["💻 Client (Next.js + SWR)"]:::frontend
    
    subgraph "External Services (Firebase)"
        Auth["🔐 Firebase Auth (JWT)"]:::external
        Storage["🖼️ Firebase Storage (Media)"]:::external
    end
    
    subgraph "Backend Tier (Node.js / Express)"
        API["⚙️ REST API (Express)"]:::backend
        Cache["⚡ LRU Cache (In-Memory)"]:::backend
        Crypto["🛡️ Crypto Service (AES-GCM)"]:::backend
        ORM["🗃️ Prisma ORM"]:::backend
    end
    
    subgraph "Database Tier (Neon)"
        Pooler["🔄 PgBouncer (Connection Pooler)"]:::database
        DB[("🐘 Serverless PostgreSQL")]:::database
    end

    %% Connections
    Client -- "1. Authenticate" --> Auth
    Client -- "2. Direct Uploads" --> Storage
    Client -- "3. API Requests (Bearer Token)" --> API
    
    API -. "Verify JWT" .-> Auth
    API -- "Encrypt / Decrypt Entries" --> Crypto
    API -- "Read Public Feed / Globals" --> Cache
    API -- "Mutations & Hydration" --> ORM
    
    Cache -- "Cache Miss (Stampede Protected)" --> ORM
    
    ORM -- "TCP Connections" --> Pooler
    Pooler -- "Pooled Queries" --> DB
```

### Component Breakdown

1. **Client (Next.js + SWR)**: The React frontend uses SWR for aggressive client-side caching of personalized data (like the Dashboard).
2. **Firebase Auth & Storage**: Handles user identity securely via JWTs. Images are uploaded directly from the client to Firebase Storage to offload bandwidth from the backend.
3. **Express REST API**: The core backend processing engine. It validates Firebase JWTs using the Firebase Admin SDK.
4. **LRU Cache**: A highly optimized in-memory cache protecting the database from burst traffic. It uses Promise-deduping (Stampede Protection) to ensure only a single database query executes when thousands of users hit an expired cache key simultaneously.
5. **Crypto Service**: Handles server-side AES-GCM encryption and decryption. Database entries are stored encrypted at rest, and only decrypted when mapping payloads for authenticated requests or the public feed.
6. **Database Tier**: Prisma ORM connects to a **Neon Serverless Postgres** database. Because serverless databases can struggle with high concurrent connection counts, **PgBouncer** is used as a middleware connection pooler to multiplex queries efficiently.
