# SentinelAuth

A backend-focused authentication and security service designed to demonstrate production-grade authentication flows, rate limiting, and abuse prevention mechanisms.

SentinelAuth is built as a standalone authentication service with a strong emphasis on system design, security, and scalability, rather than UI concerns or framework-heavy abstractions.

---

## Overview

Authentication systems are one of the most critical attack surfaces in modern applications. SentinelAuth is an experimental backend project that focuses on building secure authentication infrastructure from first principles.

The project emphasizes:

* Secure user authentication flows
* Rate limiting at multiple layers
* Brute-force and abuse prevention
* Clean separation of concerns between controllers, services, middleware, and infrastructure

SentinelAuth intentionally avoids relying on third-party authentication platforms in order to deeply understand how authentication systems are designed, attacked, and hardened in real-world production environments.

---

## Key Features

### Authentication

* Secure user signup with strong password hashing
* Login flow with credential verification
* Token-based authentication for stateless authorization

### Rate Limiting & Abuse Prevention

* IP-based rate limiting for signup endpoints
* Identity-aware rate limiting for login attempts
* Failed login attempt tracking
* Progressive throttling for repeated authentication failures

### Security Design

* Clear separation between authentication and authorization
* Middleware-based request protection
* Designed to mitigate:

  * Brute-force attacks
  * Credential stuffing
  * Bot-driven abuse

---

## System Design Philosophy

SentinelAuth is built around the following core principles:

### Defense in Depth

Multiple layers of protection are applied instead of relying on a single security control.

### Separation of Concerns

* Controllers handle HTTP request/response logic only
* Services contain authentication and security-related business logic
* Middleware enforces authorization and identity validation
* Infrastructure handles persistence, rate limiting, and external dependencies

### Explicit Trust Boundaries

Authentication and authorization responsibilities are strictly separated to reduce blast radius and improve reasoning about security guarantees.

### Design Before Code

Every feature is introduced based on a threat model, abuse scenario, or scalability concern rather than convenience or boilerplate patterns.

---

## High-Level Architecture

### Controller Layer

* Handles HTTP requests and responses
* Performs input validation and delegates logic to services
* Contains no business logic

### Service Layer

* Implements authentication workflows
* Handles credential verification and security decisions
* Coordinates with persistence and rate-limiting modules

### Rate Limiter Module

* Centralized logic for tracking and enforcing request limits
* Designed to support both IP-based and identity-based policies

### Middleware Layer

* Enforces authorization for protected routes
* Validates authentication tokens and request identity

### Persistence Layer

* Stores user records and hashed credentials
* Maintains security metadata such as failed login counts

---

## Rate Limiting Strategy

Different endpoints are protected using different rate-limiting policies based on their attack surface:

| Endpoint           | Strategy                          |
| ------------------ | --------------------------------- |
| Signup             | IP-based rate limiting            |
| Login              | Identity + IP-based rate limiting |
| Authenticated APIs | Global request limiting           |

This approach mirrors real-world security practices used in production-grade authentication systems.

---

## Why This Project Exists

Most authentication tutorials focus on *how to log in a user*.

SentinelAuth focuses on:

* Why authentication systems fail
* How attackers exploit login and signup endpoints
* How backend engineers design resilient and abuse-resistant authentication services

This project is intended as a learning and demonstration tool rather than a drop-in authentication library.

---

## Future Enhancements

* Account lockout policies
* Token rotation and revocation
* Password reset and recovery flows
* Audit logging and security event tracking
* CAPTCHA integration
* Distributed rate limiting using Redis

---

## Tech Stack

* **Runtime:** Node.js
* **Language:** TypeScript
* **Database:** PostgreSQL
* **ORM:** Drizzle
* **Security:** bcrypt
* **Architecture:** Layered backend design

---

## Disclaimer

This project is for educational and demonstration purposes only.

While it follows common industry best practices, it has not undergone a formal security audit and should not be used as-is in production environments without thorough review, testing, and hardening.
