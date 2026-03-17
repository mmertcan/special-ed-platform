# Architecture

## System scope

Single-school MVP
Web app for admins, teachers, and parents
Backend API plus database

## Core Entities

* users
* students
* student_parents
* student_teachers
* user_sessions
* daily_feed_posts
* daily_feed_media
* weekly_homework
* schedule_entries

## User roles

* admin
* teacher
* parent

## Backend stack

FastAPI
SQLite
Pydantic
Python

## Current backend modules

auth.py
db.py
main.py

## Current implemented capabilities

Health check endpoint
Student listing
Authentication with bearer tokens
Role-based authorization
Teacher-to-student assignment API
Parent-to-student assignment API
Daily feed note API

## Planned frontend surfaces

Login page
Admin dashboard
Teacher student list
Teacher daily feed posting page
Parent feed page

## Future extensions

Photo and video uploads
Weekly homework
Class program
AI-assisted features
