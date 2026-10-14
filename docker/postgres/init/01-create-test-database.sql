-- Runs once, on first initialisation of the data volume.
-- Integration tests use a separate database so they never touch dev data.
CREATE DATABASE leaveflow_test OWNER leaveflow;
