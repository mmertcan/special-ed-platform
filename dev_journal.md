# Dev Journal

## 2026-03-17

### What I built
* Table schemas
* Indexes for some of these schemas

### What I learnt
* Indexes are faster to find data because it uses logaritmic time LOG(N) via sorted tree vs Linear time O(N)
* We don't want to add the indexes to each table because
  - They take too much space in memory
  - inserts/updates become a little slower
  - Maintaning these take time
* We use the indexes for the columns that we know we will filter, join, and order

### Problems encountered
* When updating the data schema, since API endpoints were also impacted, it took longer than expected

### Next steps

* Update the other parts of the code where the change of schema impacted



## 2026-03-18

### What I built
* Update the helper functions, endpoints to adjust for the schema changes


### What I learnt
* An insert helper is a Python func whose job is to take some values, insert to a table and write a row to the database
* Sequence of data:
* - Sending a HTTP request to endpoint 
* -  Endpoint calls for the helper function
  - Route (endpoint) function validates things first
  - If validation passes, it calls the helper function (assignment helper e.g)
  - The assignment helper in db.py then opens DB connection and adds created_at_utc and inserts the data to database table
  - SQLite checks whether the inserted row obeys the schema rules, if one of those rules is broken, SQLite raises an error
* Endpoint JSON example 
* - { "parent_user_id": 3,
      "student_id": 3}


### Problems encountered
* When updating the data schema, since API endpoints were also impacted, it took longer than expected

### Next steps

* Update the other parts of the code where the change of schema impacted