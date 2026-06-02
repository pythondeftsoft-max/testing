-- ============================================
-- AI FORECAST & HEALTH OVERVIEW WIDGETS
-- Database Schema for External Database
-- ============================================

-- Main widgets table
CREATE TABLE ai_forecast_widgets (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'predictive-analytics',
    widget_type VARCHAR(100) NOT NULL,
    component_type VARCHAR(50) CHECK (component_type IN ('metric', 'chart', 'panel')),
    group_name VARCHAR(50) CHECK (group_name IN ('core-metrics', 'charts-trends', 'analysis-tools', 'comparative-analysis')),
    is_core BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget formulas and calculations
CREATE TABLE widget_formulas (
    id SERIAL PRIMARY KEY,
    widget_id VARCHAR(100) REFERENCES ai_forecast_widgets(id) ON DELETE CASCADE,
    formula_name VARCHAR(300) NOT NULL,
    formula_expression TEXT NOT NULL,
    formula_description TEXT,
    variables_used TEXT[], -- Array of input variables
    calculation_method VARCHAR(200),
    data_sources TEXT[],
    update_frequency VARCHAR(50) DEFAULT 'daily',
    confidence_level DECIMAL(5,2),
    ml_model_type VARCHAR(100),
    training_data_period VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widget categories and groups
CREATE TABLE widget_categories (
    category_id VARCHAR(50) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    total_widgets INTEGER,
    priority_level INTEGER DEFAULT 1
);

-- Performance tracking for widgets
CREATE TABLE widget_performance_metrics (
    id SERIAL PRIMARY KEY,
    widget_id VARCHAR(100) REFERENCES ai_forecast_widgets(id),
    accuracy_score DECIMAL(5,2),
    prediction_confidence DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_quality_score DECIMAL(5,2),
    computational_time_ms INTEGER
);

-- Create indexes for better performance
CREATE INDEX idx_widgets_category ON ai_forecast_widgets(category);
CREATE INDEX idx_widgets_group ON ai_forecast_widgets(group_name);
CREATE INDEX idx_widgets_type ON ai_forecast_widgets(component_type);
CREATE INDEX idx_formulas_widget ON widget_formulas(widget_id);
CREATE INDEX idx_performance_widget ON widget_performance_metrics(widget_id);

-- Insert widget categories
INSERT INTO widget_categories (category_id, category_name, description, total_widgets, priority_level) VALUES
('core-metrics', 'Core Metrics', 'Essential AI-powered performance indicators and key metrics', 21, 1),
('charts-trends', 'Charts & Trends', 'Visual analytics, forecasting charts and trend analysis', 16, 2),
('analysis-tools', 'Analysis Tools', 'Advanced analytics tools and detailed breakdowns', 19, 3),
('comparative-analysis', 'Comparative Analysis', 'Benchmarking and market positioning analysis', 6, 4);