//! Core PDF processing engine.
//!
//! This module provides the low-level primitives for parsing, rendering,
//! annotating, and exporting PDF documents. Command handlers in
//! [`crate::commands`] delegate here for all PDF-related work.

pub mod annotations;
pub mod export;
pub mod forms;
pub mod pages;
pub mod parser;
pub mod renderer;
pub mod search;
pub mod signing;
