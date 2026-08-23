## GET /user

Check if the user can access the game and the API based on the hash code, returns user information.

*Query params*
- code: string (hash code), required, contains the user pseudo and the code to access the app

*Response 200*
```
  { "pseudo": "Alice",
    "highScore": 4200,
    "highScoreList": [
      { "pseudo": "Alice", "highScore": 4200 },
      { "pseudo": "Bob",   "highScore": 3800 }
      ...
      ]
  }
```
Sends back the pseudo, the high score for this user (0 if high score not available yet) and the total high score list.

*Response 401*
Sent if hash is missing or invalid (e.g. pseudo missing, code missing or invalid)

---

## POST /score

Submit a new score.

*Body request*
```
{ "score": 100 }
```
- score: integer, required, must be >= 0

*Query params*
- code: string (hash code), required, contains the user pseudo and the code to access the app

*Response 200*
```
  { "pseudo": "Alice",
    "highScore": 4200,
    "highScoreList": [
      { "pseudo": "Alice", "highScore": 4200 },
      { "pseudo": "Bob", "highScore": 3800 },
      { "pseudo": "Charlie", "highScore": 3100 },
      { "pseudo": "Diana", "highScore": 2750 },
      { "pseudo": "Eve", "highScore": 1500 }
      ]
  }
```
Sends back the pseudo, the high score for this user and the total high score list.

Request creates a new entry if no entry exists for the current user. If an entry already exists, save the new one if score is higher than the existing one.

*Response 400*
If score is missing or < 0

*Response 401*
Sent if hash is missing or invalid (e.g. pseudo missing, code missing or invalid)
