# API specification

## Purpose

The API authenticates invited users and stores their game scores in PostgreSQL.

Each invited user has a pseudo and a six-character login code. The login code identifies the user: clients never choose or submit a pseudo when requesting user information or posting a score.

Invited users originate in a CSV file and are imported into PostgreSQL. PostgreSQL transactions and row locks must ensure concurrent score submissions cannot overwrite one another.

The production API is available at `https://api.baxcus.com`.

## Users CSV and login-code generation

The existing users CSV contains four columns in this order:

1. pseudo;
2. login code;
3. email address;
4. real name.

Before code generation, the login-code column is empty. An offline TypeScript script must populate that column while preserving the other columns, their values, and the row order. Code generation is an administrative operation and must not be exposed as an HTTP endpoint.

For example:

```csv
pseudo,login_code,email,real_name
Alice,,alice@example.com,Alice Example
Bob,,bob@example.com,Bob Example
```

becomes:

```csv
pseudo,login_code,email,real_name
Alice,K7MT3P,alice@example.com,Alice Example
Bob,9RXD4N,bob@example.com,Bob Example
```

The generator must:

- preserve an existing non-empty login code so rerunning the generator does not invalidate a user's code;
- generate a code only for a row whose login-code column is empty;
- generate exactly six characters from an easy-to-read uppercase alphabet;
- exclude ambiguous characters such as `0`, `O`, `1`, and `I`;
- use a random generator rather than deriving the code from the user's personal information;
- compare codes case-insensitively and retry if a generated code already exists;
- fail with a useful error if the CSV is malformed or contains duplicate pseudos or duplicate login codes;
- write the completed CSV through a temporary file and atomically replace the original only after the entire input has been validated.

A suitable alphabet is:

```text
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

Codes are stored in uppercase. Authentication is case-insensitive, so `k7mt3p` and `K7MT3P` identify the same user.

An administrative import command loads the completed CSV into the selected database. It updates matching users by pseudo without deleting users absent from the CSV. Email addresses and real names are administrative data and must never be returned by these endpoints.

## Authentication

Every API request must include the user's login code as a Bearer token:

```http
Authorization: Bearer K7MT3P
```

The server trims surrounding whitespace, verifies that the token has the expected six-character form, normalizes it to uppercase, and finds the matching database user. It must compare the complete code and must not accept partial matches.

The pseudo must not be accepted as authentication in a query parameter, header, or request body. After authentication, the server obtains the pseudo from the matched database row.

If the authorization header is missing, malformed, or contains an unknown code, the server returns:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
Cache-Control: no-store

{
  "error": "unauthorized"
}
```

Login codes must not be included in responses or application logs. Production traffic must use HTTPS because the code is a reusable credential.

## Score rules

- A submitted score must be a non-negative integer.
- The server stores at most the five highest scores for each user.
- After accepting a score, the user's scores are sorted from highest to lowest and all but the first five are discarded.
- Repeated scores are valid submissions and may both be retained.
- A user's high score is the first value in their stored score list, or `0` when they have no scores.
- The global leaderboard contains at most one entry per user: that user's high score.
- The global leaderboard is sorted by high score from highest to lowest.
- Users with no submitted scores are not included in the leaderboard.
- Equal high scores are ordered alphabetically by pseudo, using a case-insensitive comparison, so the result is deterministic.

The API response field remains named `highScoreList` for compatibility with the game client. It contains the top five users, not the five stored scores for the authenticated user.

## PostgreSQL storage

The database contains a `users` table and a `scores` table. A score belongs to a user through a foreign key; clients never supply that user ID.

The database must enforce:

- a case-insensitive unique pseudo;
- a case-insensitive unique six-character login code;
- a non-negative score;
- deletion of a user's scores when that user is deleted.

For `GET /user`, authentication, the user's high score, and the leaderboard are read from one repeatable-read transaction so the response is internally consistent.

For `POST /score`, the server must:

1. begin a transaction;
2. authenticate the login code and lock the matching user row;
3. insert the submitted score;
4. delete that user's scores outside their highest five;
5. calculate the response from the updated transaction state;
6. commit before reporting success.

Locking the user row serializes simultaneous submissions for that user. Submissions for different users can proceed concurrently. If any operation fails, the complete transaction must roll back and the API must not report that the score was saved.

Production and development use separate logical PostgreSQL databases with separate roles and credentials. They may share the same PostgreSQL server, but production API processes must not be able to connect with development credentials or access development tables, and vice versa.

## `GET /user`

Checks the login code and returns the authenticated user's information and the global leaderboard.

### Request

```http
GET /user HTTP/1.1
Host: api.baxcus.com
Authorization: Bearer K7MT3P
```

No query parameters or request body are required.

### `200 OK`

```json
{
  "pseudo": "Alice",
  "highScore": 4200,
  "highScoreList": [
    {
      "pseudo": "Alice",
      "highScore": 4200
    },
    {
      "pseudo": "Bob",
      "highScore": 3800
    }
  ]
}
```

`highScore` is `0` when the authenticated user has not submitted a score. In that case, the user is not included in `highScoreList` unless they later submit a score of `0`.

### `401 Unauthorized`

Returned when authentication is missing or invalid.

### `500 Internal Server Error`

Returned when stored data cannot be read or validated safely.

## `POST /score`

Submits a score for the authenticated user.

### Request

```http
POST /score HTTP/1.1
Host: api.baxcus.com
Authorization: Bearer K7MT3P
Content-Type: application/json

{
  "score": 100
}
```

The server derives the pseudo from the login code. If the body contains a pseudo, login code, email address, or real name, those values must not be used to select the user.

### `200 OK`

The score has been stored successfully. The response uses the same shape as `GET /user` and reflects the completed update:

```json
{
  "pseudo": "Alice",
  "highScore": 4200,
  "highScoreList": [
    {
      "pseudo": "Alice",
      "highScore": 4200
    },
    {
      "pseudo": "Bob",
      "highScore": 3800
    }
  ]
}
```

A valid score is stored even if it does not become the user's new high score, unless it falls outside that user's five highest scores and is consequently discarded.

### `400 Bad Request`

Returned when the JSON body is missing or malformed, or when `score` is missing, negative, not an integer, or outside JavaScript's safe-integer range.

```json
{
  "error": "invalid_score"
}
```

### `401 Unauthorized`

Returned when authentication is missing or invalid.

### `415 Unsupported Media Type`

Returned when the request does not use `Content-Type: application/json`.

### `500 Internal Server Error`

Returned when the score data cannot be read, validated, or updated safely.

## Development test administration API

These temporary endpoints are registered only by `dev-api.baxcus.com`. They must not exist on `api.baxcus.com`, and they require HTTP Basic authentication using credentials supplied through environment variables.

### `POST /admin/test-data`

Deletes existing development users and scores, then generates between 1 and 100 test users. The default is five.

```http
POST /admin/test-data HTTP/1.1
Host: dev-api.baxcus.com
Authorization: Basic <credentials>
Content-Type: application/json

{
  "count": 5
}
```

The response includes each generated test user's pseudo and login code so automated tests can authenticate as those users. The complete replacement runs in one database transaction.

### `DELETE /admin/test-data`

Deletes all users and scores from the development database in one transaction.

The test administration routes are deliberately destructive. Deployment configuration must enable them only for the development API process and development database.

## TypeScript service implementation

The API should be implemented as a small, separate TypeScript/Node.js service in the API and deployment repository. Keep the HTTP routes, authentication, leaderboard calculation, and PostgreSQL access code in separate modules so behavior can be tested without listening on a public port.

The service must:

- take the PostgreSQL connection string and allowed browser origins from environment variables;
- run idempotent schema migrations before listening for requests;
- use a maintained CSV parser so quoted commas and other valid CSV content are preserved;
- reject duplicate pseudos and case-insensitive duplicate login codes during import;
- impose a small JSON request-body limit;
- handle shutdown signals and stop accepting new requests before exiting;
- return JSON error bodies without exposing stack traces, SQL, or connection details;
- avoid logging the `Authorization` header;
- expose a simple unauthenticated health endpoint, such as `GET /health`, for container health checks.

Automated tests must cover:

- code generation without changing populated codes or other CSV fields;
- case-insensitive code authentication;
- missing, malformed, and unknown authorization values;
- invalid score bodies and valid boundary values;
- retaining exactly the five highest scores per user;
- one leaderboard entry per user and a maximum of five entries;
- deterministic ordering of tied scores;
- users without scores;
- simultaneous score submissions for the same and different users, proving that no accepted update is lost;
- transaction rollback and database failures.

## Docker and nginx deployment

The API service must have its own Docker image. The runtime image should contain only the built application and production dependencies and should run as a non-root user.

The existing PostgreSQL service hosts separate `baxcus_prod` and `baxcus_dev` databases with separate owners and credentials. PostgreSQL data must remain on its persistent Docker volume.

The same API image runs as two services. `api.baxcus.com` connects to `baxcus_prod` with the test administration API disabled. `dev-api.baxcus.com` connects to `baxcus_dev` with the Basic-authenticated test administration API enabled.

The public nginx instance terminates HTTPS and proxies each hostname to its matching API container over the internal Docker network. It must forward the `Authorization` header and must not log its value. The API containers must not publish ports on the production host.

Because the game and API use different origins, nginx or the API must return CORS headers allowing the configured game origins. It must allow the `Authorization` and `Content-Type` request headers and the required HTTP methods. The allowed origins should be explicit rather than `*`.

HTTP port 80 may serve ACME challenges but must redirect all other requests to HTTPS without proxying them to the API. Certbot obtains a certificate covering both API hostnames during deployment and the existing renewal service keeps it current. Add a container health check that calls `GET /health`, and make nginx depend on both healthy API services.
