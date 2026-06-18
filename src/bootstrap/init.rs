use std::{env, sync::Arc};
use anyhow::Context;
use sqlx::{PgPool};

use crate::{drivers::postgres::PgSQL, routes};

pub struct AppState {
    pub db: PgPool,
}

pub async fn init() -> anyhow::Result<()>  {
    boot_logo();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let postgres = PgSQL::new(database_url);
    let pool = postgres.db().await.map_err(std::io::Error::other)?;

    PgSQL::connect(&pool).await?;
    PgSQL::migrate(&pool).await?;

    boot(pool).await?;

    Ok(())
}

async fn boot(pool: PgPool) -> anyhow::Result<()> {
    let hostname = env::var("APP_URL")
        .context("APP_URL must not be empty")?;

    let hostname = hostname
        .strip_prefix("http://")
        .or_else(|| hostname.strip_prefix("https://"))
        .unwrap_or(&hostname)
        .to_string();

    tracing::info!("Starting a server on address {hostname}");

    let listener = tokio::net::TcpListener::bind(&hostname).await?;
    tracing::info!("Server listening on {hostname}");

    let state = Arc::new(AppState {
        db: pool,
    });

    let app = routes::router().with_state(state);

    axum::serve(listener, app).await?;
    tracing::info!("Server booted succesfully");

    Ok(())
}

fn boot_logo() {
    tracing::info!(
            "\n{}",
            r#"
        ╔════════════════════════════════════════════════════╗
        ║                                                    ║
        ║   ██████╗ ██████╗ ██████╗ ███████╗██████╗  ██████╗ ██╗  ██╗   ║
        ║  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝   ║
        ║  ██║     ██║   ██║██║  ██║█████╗  ██████╔╝██║   ██║ ╚███╔╝    ║
        ║  ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗██║   ██║ ██╔██╗    ║
        ║  ╚██████╗╚██████╔╝██████╔╝███████╗██████╔╝╚██████╔╝██╔╝ ██╗   ║
        ║   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ║
        ║                                                    ║
        ╚════════════════════════════════════════════════════╝
        "#
    );
}