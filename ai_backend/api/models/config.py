from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pmt"
    db_user: str = "postgres"
    db_password: str = "newpassword"

    class Config:
        env_file=".env"

settings = Settings()
#
#In this example, we define a `Settings` class that inherits from `BaseSettings`. We then
#define the configuration parameters as class attributes with default values. We also define
#a nested class `Config` that specifies the name of the environment file to load the configuration
#from.
#Finally, we create an instance of the `Settings` class and access its attributes to get the
#configuration values.
#