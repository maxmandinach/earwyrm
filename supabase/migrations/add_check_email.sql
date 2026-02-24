-- Allows client to check if an email is already registered.
-- SECURITY DEFINER runs as the function owner (postgres), granting
-- access to auth.users which is otherwise restricted from anon role.
CREATE OR REPLACE FUNCTION public.check_email_exists(email_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(email_input)
  );
END;
$$;
