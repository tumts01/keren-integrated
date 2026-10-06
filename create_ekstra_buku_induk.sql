-- Create table for Ekstrakurikuler Buku Induk
CREATE TABLE public.ekstra_buku_induk (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kelas text NOT NULL,
    semester text NOT NULL,
    tahun_ajaran text NOT NULL,
    data_ekstra jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set primary key
ALTER TABLE ONLY public.ekstra_buku_induk
    ADD CONSTRAINT ekstra_buku_induk_pkey PRIMARY KEY (id);

-- Enable RLS
ALTER TABLE public.ekstra_buku_induk ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is internal admin tool)
CREATE POLICY "Enable all actions for all users" ON public.ekstra_buku_induk
    AS PERMISSIVE FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
