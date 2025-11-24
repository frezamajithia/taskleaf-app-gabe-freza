flowchart TD
    Start([User Opens Calendar View]) --> CheckAuth{JWT Token Valid?}
    
    CheckAuth -->|No| Login[POST /api/auth/login]
    Login --> StoreJWT[Store JWT in HTTP-only Cookie]
    StoreJWT --> Start
    
    CheckAuth -->|Yes| LoadCal[Next.js Calendar Component Mounts]
    LoadCal --> FetchEvents[Axios: GET /api/calendar/events]
    
    FetchEvents --> FastAPI1[FastAPI: Validate JWT]
    FastAPI1 --> QueryDB[SQLAlchemy: Query PostgreSQL]
    QueryDB --> CheckGoogleToken{User Has Google OAuth Token?}
    
    CheckGoogleToken -->|No| ReturnLocal[Return Local Events Only]
    CheckGoogleToken -->|Yes| FetchGoogle[FastAPI: Call Google Calendar API]
    
    FetchGoogle --> CheckTokenValid{OAuth Token Valid?}
    CheckTokenValid -->|No| RefreshOAuth[Refresh Google OAuth Token]
    RefreshOAuth --> CheckRefresh{Refresh Success?}
    CheckRefresh -->|No| ReturnLocal
    CheckRefresh -->|Yes| GetGoogleEvents[GET Google Calendar Events]
    
    CheckTokenValid -->|Yes| GetGoogleEvents
    GetGoogleEvents --> MergeEvents[FastAPI: Merge Local & Google Events]
    MergeEvents --> ReturnJSON[Return JSON Response]
    
    ReturnLocal --> ReturnJSON
    ReturnJSON --> UpdateZustand[Zustand: Update Calendar State]
    UpdateZustand --> RenderCalendar[Render Calendar with shadcn UI]
    RenderCalendar --> FramerMotion[Framer Motion: Animate Event Cards]
    FramerMotion --> DisplayCal[Display Unified Calendar View]
    
    DisplayCal --> UserAction{User Action}
    
    UserAction -->|View Event| ViewEvent[Display Event Details Modal]
    ViewEvent --> DisplayCal
    
    UserAction -->|Create Event| CreateModal[Open shadcn Dialog Component]
    CreateModal --> InputForm[React Hook Form: Input Event Details]
    InputForm --> SelectSource{Save Location}
    
    SelectSource -->|Local Only| PostLocal[Axios: POST /api/calendar/events]
    PostLocal --> FastAPI2[FastAPI: Validate JWT & Parse Body]
    FastAPI2 --> SQLCreate[SQLAlchemy: INSERT into events table]
    SQLCreate --> PostgresInsert[PostgreSQL: Save Event]
    PostgresInsert --> ReturnCreated[Return 201 Created]
    ReturnCreated --> UpdateZustand2[Zustand: Add Event to State]
    UpdateZustand2 --> AnimateNew[Framer Motion: Animate New Event]
    AnimateNew --> DisplayCal
    
    SelectSource -->|Google Calendar| PostGoogle[Axios: POST /api/calendar/events<br/>with google_sync: true]
    PostGoogle --> FastAPI3[FastAPI: Validate JWT]
    FastAPI3 --> CheckOAuth{OAuth Token Exists?}
    
    CheckOAuth -->|No| Return401[Return 401 Unauthorized]
    Return401 --> ShowError1[Display Error Toast]
    ShowError1 --> PromptConnect[Prompt: Connect Google Calendar]
    PromptConnect --> DisplayCal
    
    CheckOAuth -->|Yes| ValidateToken{OAuth Token Valid?}
    ValidateToken -->|No| RefreshOAuth2[Refresh Google OAuth Token]
    RefreshOAuth2 --> CheckRefresh2{Refresh Success?}
    CheckRefresh2 -->|No| Return401
    CheckRefresh2 -->|Yes| PostToGoogle[POST to Google Calendar API]
    
    ValidateToken -->|Yes| PostToGoogle
    PostToGoogle --> GoogleResponse{API Success?}
    GoogleResponse -->|No| Return500[Return 500 Error]
    Return500 --> ShowError2[Display Error Toast]
    ShowError2 --> DisplayCal
    
    GoogleResponse -->|Yes| SaveBoth[SQLAlchemy: INSERT with google_event_id]
    SaveBoth --> PostgresInsert2[PostgreSQL: Save Event + Google ID]
    PostgresInsert2 --> ReturnCreated2[Return 201 Created]
    ReturnCreated2 --> UpdateZustand2
    
    UserAction -->|Edit Event| EditModal[Open shadcn Dialog with Event Data]
    EditModal --> LoadEvent[Zustand: Get Event from State]
    LoadEvent --> CheckSource{Event Source?}
    
    CheckSource -->|Local| EditForm[React Hook Form: Edit Details]
    EditForm --> PatchLocal[Axios: PATCH /api/calendar/events/:id]
    PatchLocal --> FastAPI4[FastAPI: Validate JWT]
    FastAPI4 --> SQLUpdate[SQLAlchemy: UPDATE events table]
    SQLUpdate --> PostgresUpdate[PostgreSQL: Update Event]
    PostgresUpdate --> Return200[Return 200 OK]
    Return200 --> UpdateZustand3[Zustand: Update Event in State]
    UpdateZustand3 --> DisplayCal
    
    CheckSource -->|Google| EditFormGoogle[React Hook Form: Edit Details]
    EditFormGoogle --> PatchGoogle[Axios: PATCH /api/calendar/events/:id]
    PatchGoogle --> FastAPI5[FastAPI: Validate JWT & OAuth]
    FastAPI5 --> PatchGoogleAPI[PATCH Google Calendar API]
    PatchGoogleAPI --> GoogleResponse2{API Success?}
    GoogleResponse2 -->|No| Return500_2[Return 500 Error]
    Return500_2 --> ShowError3[Display Error Toast]
    ShowError3 --> DisplayCal
    GoogleResponse2 -->|Yes| SQLUpdate2[SQLAlchemy: UPDATE local copy]
    SQLUpdate2 --> PostgresUpdate2[PostgreSQL: Update Event]
    PostgresUpdate2 --> Return200_2[Return 200 OK]
    Return200_2 --> UpdateZustand3
    
    UserAction -->|Delete Event| ConfirmDialog[shadcn Alert Dialog: Confirm]
    ConfirmDialog --> ConfirmDelete{User Confirms?}
    ConfirmDelete -->|No| DisplayCal
    ConfirmDelete -->|Yes| CheckSource2{Event Source?}
    
    CheckSource2 -->|Local| DeleteLocal[Axios: DELETE /api/calendar/events/:id]
    DeleteLocal --> FastAPI6[FastAPI: Validate JWT]
    FastAPI6 --> SQLDelete[SQLAlchemy: DELETE from events table]
    SQLDelete --> PostgresDelete[PostgreSQL: Remove Event]
    PostgresDelete --> Return204[Return 204 No Content]
    Return204 --> UpdateZustand4[Zustand: Remove Event from State]
    UpdateZustand4 --> AnimateOut[Framer Motion: Animate Removal]
    AnimateOut --> DisplayCal
    
    CheckSource2 -->|Google| DeleteGoogle[Axios: DELETE /api/calendar/events/:id]
    DeleteGoogle --> FastAPI7[FastAPI: Validate JWT & OAuth]
    FastAPI7 --> DeleteGoogleAPI[DELETE via Google Calendar API]
    DeleteGoogleAPI --> GoogleResponse3{API Success?}
    GoogleResponse3 -->|No| Return500_3[Return 500 Error]
    Return500_3 --> ShowError4[Display Error Toast]
    ShowError4 --> DisplayCal
    GoogleResponse3 -->|Yes| SQLDelete2[SQLAlchemy: DELETE local copy]
    SQLDelete2 --> PostgresDelete2[PostgreSQL: Remove Event]
    PostgresDelete2 --> Return204_2[Return 204 No Content]
    Return204_2 --> UpdateZustand4
    
    UserAction -->|Connect Google| OAuthButton[Click: Connect Google Calendar Button]
    OAuthButton --> RedirectOAuth[Axios: GET /api/auth/google/login]
    RedirectOAuth --> FastAPI8[FastAPI: Generate OAuth URL]
    FastAPI8 --> GoogleConsent[Redirect to Google OAuth Consent]
    GoogleConsent --> UserConsent{User Grants Permission?}
    UserConsent -->|No| DisplayCal
    UserConsent -->|Yes| Callback[Google Callback to FastAPI]
    Callback --> ExchangeToken[FastAPI: Exchange Code for Tokens]
    ExchangeToken --> SQLSaveToken[SQLAlchemy: Store OAuth Tokens]
    SQLSaveToken --> PostgresToken[PostgreSQL: Save in users table]
    PostgresToken --> InitialSync[Axios: GET /api/calendar/events]
    InitialSync --> DisplayCal
    
    UserAction -->|Disconnect Google| DisconnectButton[Click: Disconnect Button]
    DisconnectButton --> ConfirmDisconnect{shadcn Alert Dialog}
    ConfirmDisconnect -->|No| DisplayCal
    ConfirmDisconnect -->|Yes| RevokeAPI[Axios: POST /api/auth/google/revoke]
    RevokeAPI --> FastAPI9[FastAPI: Revoke OAuth Token]
    FastAPI9 --> SQLRemoveToken[SQLAlchemy: Delete OAuth Tokens]
    SQLRemoveToken --> PostgresRemove[PostgreSQL: Clear tokens]
    PostgresRemove --> UpdateZustand5[Zustand: Remove Google Events]
    UpdateZustand5 --> DisplayCal
    
    UserAction -->|Exit| End([End Session])
    
    style Start fill:#4CAF50,color:#fff
    style End fill:#f44336,color:#fff
    style DisplayCal fill:#FF9800,color:#fff
    style FastAPI1 fill:#009688,color:#fff
    style FastAPI2 fill:#009688,color:#fff
    style FastAPI3 fill:#009688,color:#fff
    style FastAPI4 fill:#009688,color:#fff
    style FastAPI5 fill:#009688,color:#fff
    style FastAPI6 fill:#009688,color:#fff
    style FastAPI7 fill:#009688,color:#fff
    style FastAPI8 fill:#009688,color:#fff
    style FastAPI9 fill:#009688,color:#fff
    style PostgresInsert fill:#336791,color:#fff
    style PostgresInsert2 fill:#336791,color:#fff
    style PostgresUpdate fill:#336791,color:#fff
    style PostgresUpdate2 fill:#336791,color:#fff
    style PostgresDelete fill:#336791,color:#fff
    style PostgresDelete2 fill:#336791,color:#fff
    style PostgresToken fill:#336791,color:#fff
    style PostgresRemove fill:#336791,color:#fff
    style UpdateZustand fill:#764ABC,color:#fff
    style UpdateZustand2 fill:#764ABC,color:#fff
    style UpdateZustand3 fill:#764ABC,color:#fff
    style UpdateZustand4 fill:#764ABC,color:#fff
    style UpdateZustand5 fill:#764ABC,color:#fff
    style PostToGoogle fill:#4285F4,color:#fff
    style PatchGoogleAPI fill:#4285F4,color:#fff
    style DeleteGoogleAPI fill:#4285F4,color:#fff