SentinelAuth

A backend-focused authentication and security service designed to demonstrate production-grade auth flows, rate limiting, and abuse prevention mechanisms.

SentinelAuth is built as a standalone authentication service with an emphasis on system design, security, and scalability, rather than UI or framework-heavy abstractions.

Overview

Authentication systems are a critical attack surface in modern applications. SentinelAuth is an experimental backend project that focuses on:

Secure user authentication

Rate limiting at multiple layers

Brute-force and abuse protection

Clean separation of concerns between controllers, services, and infrastructure

This project intentionally avoids relying on third-party auth platforms to deeply understand and implement authentication mechanics from first principles.

Key Features
Authentication

Secure user signup with password hashing

Login flow with credential verification

Token-based authentication (stateless authorization)

Rate Limiting & Abuse Prevention

IP-based rate limiting for signup

Identity-aware rate limiting for login

Failed login attempt tracking

Progressive throttling for repeated authentication failures

Security Design

Clear separation between authentication and authorization

Middleware-based request protection

Designed to mitigate:

Brute-force attacks

Credential stuffing

Bot-driven abuse

System Design Philosophy

SentinelAuth is built around the following principles:

Defense in Depth
Multiple layers of protection rather than a single control.

Separation of Concerns
Controllers handle HTTP, services handle business logic, middleware handles authorization, and infrastructure handles persistence and limits.

Explicit Trust Boundaries
Authentication and authorization responsibilities are strictly separated.

Design Before Code
Each feature is introduced based on a threat model or scalability concern.

High-Level Architecture

Controller Layer
Handles HTTP requests and responses. No business logic.

Service Layer
Contains authentication logic, credential verification, and security decisions.

Rate Limiter Module
Centralized logic for tracking and enforcing request limits.

Middleware Layer
Responsible for request authorization and identity validation.

Persistence Layer
Stores user data, hashed credentials, and security metadata.

Rate Limiting Strategy

Different endpoints are protected using different rate-limiting policies based on their attack surface:

Endpoint	Strategy
Signup	IP-based limiting
Login	Identity + IP-based limiting
Authenticated APIs	Global request limiting

This design reflects real-world security practices used in production systems.

Why This Project Exists

Most authentication tutorials focus on “how to log in a user.”
SentinelAuth focuses on:

Why auth systems fail

How attackers exploit login endpoints

How backend engineers design resilient authentication services

This project is intended as a learning and demonstration tool, not a drop-in auth library.

Future Enhancements

Account lockout policies

Token rotation and revocation

Password reset flows

Audit logging

CAPTCHA integration

Distributed rate limiting (Redis-backed)

Tech Stack

Runtime: Node.js

Language: TypeScript

Database: PostgreSQL

ORM: Prisma

Security: bcrypt

Architecture: Layered backend design

Disclaimer

This project is for educational and demonstration purposes.
While it follows best practices, it is not intended for direct production use without further review and hardening.