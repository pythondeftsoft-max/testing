-- Phase 6: Enterprise & Advanced Features Database Schema

-- 1. White Label Team Management
CREATE TABLE IF NOT EXISTS public.white_label_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'Main Team',
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Team members with role-based access
CREATE TABLE IF NOT EXISTS public.white_label_team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.white_label_teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    joined_at timestamp with time zone,
    is_active boolean DEFAULT true,
    permissions jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 2. Advanced SEO & Marketing
CREATE TABLE IF NOT EXISTS public.white_label_seo_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    meta_title text,
    meta_description text,
    meta_keywords text[],
    og_title text,
    og_description text,
    og_image_url text,
    twitter_card_type text DEFAULT 'summary_large_image',
    twitter_title text,
    twitter_description text,
    twitter_image_url text,
    structured_data jsonb DEFAULT '{}',
    google_analytics_id text,
    google_tag_manager_id text,
    facebook_pixel_id text,
    sitemap_enabled boolean DEFAULT true,
    robots_txt text,
    canonical_url text,
    hreflang_configs jsonb DEFAULT '[]',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Advanced Customization
CREATE TABLE IF NOT EXISTS public.white_label_custom_themes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    theme_name text NOT NULL,
    is_active boolean DEFAULT false,
    custom_css text,
    custom_js text,
    component_overrides jsonb DEFAULT '{}',
    layout_config jsonb DEFAULT '{}',
    animation_settings jsonb DEFAULT '{}',
    responsive_breakpoints jsonb DEFAULT '{}',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Page builder components
CREATE TABLE IF NOT EXISTS public.white_label_page_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    page_type text NOT NULL DEFAULT 'landing',
    component_type text NOT NULL,
    component_data jsonb NOT NULL DEFAULT '{}',
    position_order integer NOT NULL DEFAULT 0,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Enterprise Security & Compliance
CREATE TABLE IF NOT EXISTS public.white_label_security_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    ssl_auto_renewal boolean DEFAULT true,
    security_headers jsonb DEFAULT '{}',
    content_security_policy text,
    privacy_policy_url text,
    terms_of_service_url text,
    gdpr_compliance_enabled boolean DEFAULT false,
    cookie_consent_config jsonb DEFAULT '{}',
    backup_frequency text DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
    last_backup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Audit logs for configuration changes
CREATE TABLE IF NOT EXISTS public.white_label_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Integration & Automation Hub
CREATE TABLE IF NOT EXISTS public.white_label_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    integration_type text NOT NULL,
    integration_name text NOT NULL,
    api_credentials jsonb DEFAULT '{}',
    webhook_url text,
    webhook_secret text,
    settings jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Lead capture forms
CREATE TABLE IF NOT EXISTS public.white_label_forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id uuid NOT NULL REFERENCES public.white_label_configs(id) ON DELETE CASCADE,
    form_name text NOT NULL,
    form_type text NOT NULL DEFAULT 'contact',
    fields jsonb NOT NULL DEFAULT '[]',
    styling jsonb DEFAULT '{}',
    success_message text,
    redirect_url text,
    email_notifications boolean DEFAULT true,
    integration_mappings jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS public.white_label_form_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid NOT NULL REFERENCES public.white_label_forms(id) ON DELETE CASCADE,
    submission_data jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.white_label_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_seo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_page_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_security_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Teams: Config owners can manage their teams
CREATE POLICY "Config owners can manage their teams"
ON public.white_label_teams
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_teams.config_id
        AND wlc.user_id = auth.uid()
    )
);

-- Team members: Team members can view, owners can manage
CREATE POLICY "Team members can view their teams"
ON public.white_label_team_members
FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.white_label_teams wlt
        JOIN public.white_label_configs wlc ON wlt.config_id = wlc.id
        WHERE wlt.id = white_label_team_members.team_id
        AND wlc.user_id = auth.uid()
    )
);

CREATE POLICY "Config owners can manage team members"
ON public.white_label_team_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_teams wlt
        JOIN public.white_label_configs wlc ON wlt.config_id = wlc.id
        WHERE wlt.id = white_label_team_members.team_id
        AND wlc.user_id = auth.uid()
    )
);

-- SEO configs: Config owners and team editors can manage
CREATE POLICY "Config team can manage SEO configs"
ON public.white_label_seo_configs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_seo_configs.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.role IN ('owner', 'editor')
                AND wltm.is_active = true
            )
        )
    )
);

-- Apply similar policies for other tables
CREATE POLICY "Config team can manage custom themes"
ON public.white_label_custom_themes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_custom_themes.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.role IN ('owner', 'editor')
                AND wltm.is_active = true
            )
        )
    )
);

CREATE POLICY "Config team can manage page components"
ON public.white_label_page_components
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_page_components.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.role IN ('owner', 'editor')
                AND wltm.is_active = true
            )
        )
    )
);

CREATE POLICY "Config owners can manage security configs"
ON public.white_label_security_configs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_security_configs.config_id
        AND wlc.user_id = auth.uid()
    )
);

CREATE POLICY "Config team can view audit logs"
ON public.white_label_audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_audit_logs.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.is_active = true
            )
        )
    )
);

CREATE POLICY "System can insert audit logs"
ON public.white_label_audit_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Config team can manage integrations"
ON public.white_label_integrations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_integrations.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.role IN ('owner', 'editor')
                AND wltm.is_active = true
            )
        )
    )
);

CREATE POLICY "Config team can manage forms"
ON public.white_label_forms
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_configs wlc
        WHERE wlc.id = white_label_forms.config_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.role IN ('owner', 'editor')
                AND wltm.is_active = true
            )
        )
    )
);

CREATE POLICY "Public can submit forms"
ON public.white_label_form_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Config team can view form submissions"
ON public.white_label_form_submissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.white_label_forms wlf
        JOIN public.white_label_configs wlc ON wlf.config_id = wlc.id
        WHERE wlf.id = white_label_form_submissions.form_id
        AND (
            wlc.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.white_label_teams wlt
                JOIN public.white_label_team_members wltm ON wlt.id = wltm.team_id
                WHERE wlt.config_id = wlc.id
                AND wltm.user_id = auth.uid()
                AND wltm.is_active = true
            )
        )
    )
);

-- Create updated_at triggers
CREATE TRIGGER update_white_label_teams_updated_at
    BEFORE UPDATE ON public.white_label_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_team_members_updated_at
    BEFORE UPDATE ON public.white_label_team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_seo_configs_updated_at
    BEFORE UPDATE ON public.white_label_seo_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_custom_themes_updated_at
    BEFORE UPDATE ON public.white_label_custom_themes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_page_components_updated_at
    BEFORE UPDATE ON public.white_label_page_components
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_security_configs_updated_at
    BEFORE UPDATE ON public.white_label_security_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_integrations_updated_at
    BEFORE UPDATE ON public.white_label_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_white_label_forms_updated_at
    BEFORE UPDATE ON public.white_label_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_white_label_teams_config_id ON public.white_label_teams(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_team_members_team_id ON public.white_label_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_white_label_team_members_user_id ON public.white_label_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_seo_configs_config_id ON public.white_label_seo_configs(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_custom_themes_config_id ON public.white_label_custom_themes(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_page_components_config_id ON public.white_label_page_components(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_security_configs_config_id ON public.white_label_security_configs(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_logs_config_id ON public.white_label_audit_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_integrations_config_id ON public.white_label_integrations(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_forms_config_id ON public.white_label_forms(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_form_submissions_form_id ON public.white_label_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_white_label_form_submissions_created_at ON public.white_label_form_submissions(created_at);