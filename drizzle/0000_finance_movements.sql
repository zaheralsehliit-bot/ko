CREATE TABLE `finance_movements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `account_name` text NOT NULL,
  `category` text NOT NULL,
  `amount` integer NOT NULL,
  `direction` text NOT NULL,
  `payment_method` text DEFAULT 'نقدي' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
