-- Add new withdrawal categories for interest and profit (column already exists)
INSERT INTO withdrawal_categories (category_name, description, chart_account_code) VALUES
('Interest Payments', 'Interest payments to partners on their investment', '5200'),
('Profit Distributions', 'Distribution of business profits to partners', '3300');

-- Add subcategories
INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Monthly Interest', 'Regular monthly interest payment'
FROM withdrawal_categories c WHERE c.category_name = 'Interest Payments';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Quarterly Interest', 'Quarterly interest payment'
FROM withdrawal_categories c WHERE c.category_name = 'Interest Payments';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Quarterly Profit', 'Quarterly profit distribution'
FROM withdrawal_categories c WHERE c.category_name = 'Profit Distributions';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Annual Profit', 'Annual profit distribution'
FROM withdrawal_categories c WHERE c.category_name = 'Profit Distributions';