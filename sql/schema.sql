-- ============================================
-- Coffee Shop API - Database Schema
-- DIT207 Final Project
-- ============================================

CREATE DATABASE IF NOT EXISTS coffee_shop;
USE coffee_shop;

-- ----------------------------------------
-- Table: users
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  phone       VARCHAR(20)  DEFAULT NULL,
  avatar_url  VARCHAR(500) DEFAULT NULL,
  role        ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ----------------------------------------
-- Table: coffees  (existing, extended)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS coffees (
  id          INT            NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)   NOT NULL,
  description TEXT           DEFAULT NULL,
  price       DECIMAL(10,2)  NOT NULL,
  image_url   VARCHAR(500)   DEFAULT NULL,
  category    VARCHAR(80)    DEFAULT NULL,
  is_available TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ----------------------------------------
-- Table: orders
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id           INT  NOT NULL AUTO_INCREMENT,
  user_id      INT  NOT NULL,
  status       ENUM('pending','preparing','delivering','completed','cancelled')
                    NOT NULL DEFAULT 'pending',
  total_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  note         TEXT          DEFAULT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------
-- Table: order_items
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id         INT            NOT NULL AUTO_INCREMENT,
  order_id   INT            NOT NULL,
  coffee_id  INT            NOT NULL,
  quantity   INT            NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2)  NOT NULL,          -- snapshot price at order time
  subtotal   DECIMAL(10,2)  GENERATED ALWAYS AS (quantity * unit_price) STORED,
  PRIMARY KEY (id),
  CONSTRAINT fk_oi_order  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE,
  CONSTRAINT fk_oi_coffee FOREIGN KEY (coffee_id) REFERENCES coffees(id) ON DELETE RESTRICT
);

-- ----------------------------------------
-- Table: refresh_tokens  (JWT rotation)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT          NOT NULL AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------
-- Seed: sample coffees
-- ----------------------------------------
INSERT INTO coffees (name, description, price, category) VALUES
  ('Espresso',      'Strong single shot',              45.00, 'hot'),
  ('Americano',     'Espresso + hot water',            55.00, 'hot'),
  ('Latte',         'Espresso + steamed milk',         65.00, 'hot'),
  ('Cappuccino',    'Espresso + foam',                 65.00, 'hot'),
  ('Cold Brew',     'Slow-brewed cold coffee',         75.00, 'cold'),
  ('Frappuccino',   'Blended iced coffee',             85.00, 'cold');

-- ----------------------------------------
-- Seed: admin user  (password: admin1234)
-- ----------------------------------------
INSERT INTO users (name, email, password, role) VALUES
  ('Admin', 'admin@coffee.shop',
   '$2b$10$examplehashadmin1234xxxxxxxxxxxxxxxxxxxxxxxx', 'admin');
