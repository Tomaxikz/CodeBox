use anyhow::Context;
use sqlx::PgPool;

use crate::app::drivers::pg;

#[derive(Clone)]
pub struct AppState {
    pub database: PgPool,
}

impl AppState {
    pub async fn initialize() -> anyhow::Result<Self> {
        let database_url =
            std::env::var("DATABASE_URL").context("DATABASE_URL is not configured")?;

        Self::connect(&database_url).await
    }

    pub async fn connect(database_url: &str) -> anyhow::Result<Self> {
        let database = pg::connect(database_url).await?;

        Ok(Self { database })
    }
}
