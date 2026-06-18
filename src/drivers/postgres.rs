use sqlx::{postgres::PgPoolOptions, PgPool};

pub struct PgSQL {
    pub url: String
    
}

impl PgSQL {
    pub fn new(url: String) -> Self {
        Self { url }
    }

    pub async fn db(&self) -> Result<PgPool, sqlx::Error> {
        PgPoolOptions::new()
            .max_connections(5)
            .connect(&self.url)
            .await
    }
    pub async fn migrate(pool: &PgPool) -> Result<(), sqlx::Error> {
        tracing::info!("Running database migrations...");
        sqlx::migrate!("./migrations")
            .run(pool)
            .await?;
        
        tracing::info!("Database migration finished succesfully");
        Ok(())
    }

    // I know that this is probably horrible way to do it but ill keep it for now
    pub async fn connect(pool: &PgPool) -> Result<(), sqlx::Error> {
        match sqlx::query("SELECT 1").execute(pool).await {
            Ok(_) => {
                tracing::info!("Database connected succesfully");
                Ok(())
            }
            Err(err) => {
                tracing::error!("Database connection failed");
                Err(err)
            }
        }
    }
}