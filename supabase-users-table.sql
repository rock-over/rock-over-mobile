-- Create users table in Supabase
-- This table will store user registration information including authentication details

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255), -- For email/password authentication (hashed)
    grading_system VARCHAR(50) NOT NULL DEFAULT 'yds',
    
    -- Google OAuth fields
    google_id VARCHAR(255) UNIQUE,
    google_email VARCHAR(255),
    google_name VARCHAR(100),
    google_photo_url TEXT,
    
    -- Facebook OAuth fields (for future implementation)
    facebook_id VARCHAR(255) UNIQUE,
    facebook_email VARCHAR(255),
    facebook_name VARCHAR(100),
    facebook_photo_url TEXT,
    
    -- Profile information
    profile_picture_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    
    -- Account status and metadata
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_facebook_id ON users(facebook_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Only authenticated users can insert (during registration)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to handle user registration
CREATE OR REPLACE FUNCTION register_user(
    p_email VARCHAR(255),
    p_name VARCHAR(100),
    p_password VARCHAR(255),
    p_grading_system VARCHAR(50) DEFAULT 'yds'
)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    result JSON;
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email already exists'
        );
    END IF;
    
    -- Insert new user
    INSERT INTO users (email, name, password_hash, grading_system)
    VALUES (p_email, p_name, crypt(p_password, gen_salt('bf')), p_grading_system)
    RETURNING id INTO user_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'user_id', user_id,
        'message', 'User registered successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle Google OAuth user creation/update
CREATE OR REPLACE FUNCTION upsert_google_user(
    p_google_id VARCHAR(255),
    p_email VARCHAR(255),
    p_name VARCHAR(100),
    p_photo_url TEXT DEFAULT NULL,
    p_grading_system VARCHAR(50) DEFAULT 'yds'
)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    result JSON;
BEGIN
    -- Try to find existing user by Google ID or email
    SELECT id INTO user_id 
    FROM users 
    WHERE google_id = p_google_id OR email = p_email
    LIMIT 1;
    
    IF user_id IS NULL THEN
        -- Create new user
        INSERT INTO users (
            email, name, google_id, google_email, 
            google_name, google_photo_url, grading_system,
            email_verified, last_login_at
        )
        VALUES (
            p_email, p_name, p_google_id, p_email,
            p_name, p_photo_url, p_grading_system,
            true, NOW()
        )
        RETURNING id INTO user_id;
        
        result := json_build_object(
            'success', true,
            'user_id', user_id,
            'is_new_user', true,
            'message', 'Google user created successfully'
        );
    ELSE
        -- Update existing user
        UPDATE users SET
            google_id = p_google_id,
            google_email = p_email,
            google_name = p_name,
            google_photo_url = p_photo_url,
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;
        
        result := json_build_object(
            'success', true,
            'user_id', user_id,
            'is_new_user', false,
            'message', 'Google user updated successfully'
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to authenticate user with email/password
CREATE OR REPLACE FUNCTION authenticate_user(
    p_email VARCHAR(255),
    p_password VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    -- Find user and verify password
    SELECT id, email, name, grading_system, is_active, email_verified
    INTO user_record
    FROM users 
    WHERE email = p_email 
    AND password_hash = crypt(p_password, password_hash)
    AND is_active = true;
    
    IF user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid email or password'
        );
    END IF;
    
    -- Update last login
    UPDATE users SET last_login_at = NOW() WHERE id = user_record.id;
    
    -- Return user data
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'name', user_record.name,
            'grading_system', user_record.grading_system,
            'email_verified', user_record.email_verified
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add pgcrypto extension for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert some sample grading systems for reference
COMMENT ON COLUMN users.grading_system IS 'Preferred climbing grading system: yds, french, uiaa, british, v-scale, font';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT EXECUTE ON FUNCTION register_user TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_google_user TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user TO authenticated; 