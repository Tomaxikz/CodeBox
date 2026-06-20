use axum::{http::{HeaderValue, header}, response::Response};

use crate::misc::http_errors::HttpError;


#[derive(Debug, Clone, Copy)]
pub enum SameSite {
    Lax,
    Strict,
    None,
}

impl SameSite {
    fn as_str(self) -> &'static str {
        match self {
            Self::Lax => "Lax",
            Self::Strict => "Strict",
            Self::None => "None",
        }
    }
}

pub struct CookieOptions<'a> {
    pub path: &'a str,
    pub domain: Option<&'a str>,
    pub max_age: Option<i64>,
    pub expires: Option<&'a str>,
    pub http_only: bool,
    pub secure: bool,
    pub same_site: SameSite,
}

impl Default for CookieOptions<'_> {
    fn default() -> Self {
        Self {
            path: "/",
            domain: None,
            max_age: None,
            http_only: true,
            expires: None,
            secure: true,
            same_site: SameSite::Lax,
        }
    }
}

pub fn set_cookie(
    response: &mut Response,
    name: &str,
    value: &str,
    options: CookieOptions<'_>,
) -> Result<(), HttpError> {
    let cookie = build_cookie(name, value, options)?;

    response.headers_mut().append(header::SET_COOKIE, cookie);

    Ok(())
}

pub fn clear_cookie(
    response: &mut Response,
    name: &str,
    mut options: CookieOptions<'_>,
) -> Result<(), HttpError> {
    options.max_age = Some(0);
    options.expires = Some("Thu, 01 Jan 1970 00:00:00 GMT");

    set_cookie(response, name, "", options)
}

pub fn read_cookie<'a>(cookie_header: &'a str, name: &str) -> Option<&'a str> {
    cookie_header
        .split(';')
        .map(str::trim)
        .find_map(|cookie| {
            let (cookie_name, cookie_value) = cookie.split_once('=')?;

            if cookie_name == name {
                Some(cookie_value)
            } else {
                None
            }
        })
}

fn build_cookie(
    name: &str,
    value: &str,
    options: CookieOptions<'_>,
) -> Result<HeaderValue, HttpError> {
    let mut cookie = format!("{name}={value}; Path={}", options.path);

    if let Some(domain) = options.domain {
        cookie.push_str("; Domain=");
        cookie.push_str(domain);
    }

    if let Some(max_age) = options.max_age {
        cookie.push_str("; Max-Age=");
        cookie.push_str(&max_age.to_string());
    }

    if options.http_only {
        cookie.push_str("; HttpOnly");
    }

    if options.secure {
        cookie.push_str("; Secure");
    }

    if let Some(expires) = options.expires {
        cookie.push_str("; Expires=");
        cookie.push_str(expires);
    }

    cookie.push_str("; SameSite=");
    cookie.push_str(options.same_site.as_str());

    HeaderValue::from_str(&cookie)
        .map_err(|_| HttpError::Internal("Failed to create cookie".to_string()))
}