-- FIX INFINITE RECURSION ERROR

-- 1. Create a secure function to read roles without triggering policies
--    "SECURITY DEFINER" means this function runs with the privileges of the creator (you/admin), 
--    bypassing the RLS check on the profiles table itself.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the broken recursive policy
DROP POLICY IF EXISTS "Admins can do everything" ON public.profiles;

-- 3. Create the new Safe Policy
CREATE POLICY "Admins can do everything" ON public.profiles
FOR ALL USING (
  public.get_my_role() = 'admin'
);

-- 4. Re-run admin grant just to be sure
UPDATE public.profiles 
SET role = 'admin', account_status = 'active' 
WHERE username = 'george';
