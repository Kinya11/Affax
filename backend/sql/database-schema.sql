-- Category Table: Normalized category names
CREATE TABLE `Category` (
    `category_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, -- Unique ID for each category
    `category_name` VARCHAR(100) NOT NULL UNIQUE -- Name of the category (e.g., Games, Productivity)
);

-- App Table: Stores app details
CREATE TABLE `App` (
    `app_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, -- Unique app ID
    `name` VARCHAR(255) NOT NULL, -- App name
    `description` TEXT NOT NULL, -- App description
    `category` SMALLINT UNSIGNED NOT NULL, -- Foreign key to Category (matches category_id type)
    `website` VARCHAR(2083) NOT NULL, -- Official website URL
    `file_size_bytes` BIGINT UNSIGNED NOT NULL, -- File size in bytes
    `icon_file_location` VARCHAR(2083) NOT NULL, -- Path or URL of the app's icon
    FOREIGN KEY (`category`) REFERENCES `Category`(`category_id`) -- Link to category table
);

-- User Table: Stores user details
CREATE TABLE `User` (
    `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, -- Unique user ID
    `user_first_name` VARCHAR(100) NOT NULL, -- User's first name
    `user_last_name` VARCHAR(100) NOT NULL, -- User's last name
    `plan` TINYINT UNSIGNED NOT NULL DEFAULT 1 -- Subscription plan (default: 1)
);

-- List Table: Stores user-created lists
CREATE TABLE `List` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, -- Unique list ID
    `list_name` VARCHAR(255) NOT NULL, -- Name of the list
    `user_id` INT UNSIGNED NOT NULL, -- Foreign key to User (Owner of the list)
    FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) -- Link to user table
);

-- Lists_Apps_Link Table: Many-to-Many relationship between List and App
CREATE TABLE `Lists_Apps_Link` (
    `app_id` INT UNSIGNED NOT NULL, -- Foreign key to App
    `list_id` INT UNSIGNED NOT NULL, -- Foreign key to List
    PRIMARY KEY (`app_id`, `list_id`), -- Composite primary key for the many-to-many link
    FOREIGN KEY (`app_id`) REFERENCES `App`(`app_id`), -- Link to app table
    FOREIGN KEY (`list_id`) REFERENCES `List`(`id`) -- Link to list table
);
