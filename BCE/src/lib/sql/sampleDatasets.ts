import { Database } from './types';

export const SAMPLE_DATASETS: Record<string, Database> = {
  employees_departments: {
    name: 'Employees & Departments',
    tables: {
      departments: {
        name: 'departments',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'department_name', type: 'TEXT' },
          { name: 'location', type: 'TEXT' },
          { name: 'budget', type: 'REAL' }
        ],
        rows: [
          { id: 1, department_name: 'Engineering', location: 'Building A, Floor 3', budget: 1500000.0 },
          { id: 2, department_name: 'Data Science', location: 'Building A, Floor 4', budget: 1200000.0 },
          { id: 3, department_name: 'Product Management', location: 'Building B, Floor 2', budget: 850000.0 },
          { id: 4, department_name: 'Design & UX', location: 'Building B, Floor 1', budget: 600000.0 },
          { id: 5, department_name: 'Marketing', location: 'Building C, Floor 5', budget: 950000.0 },
          { id: 6, department_name: 'Human Resources', location: 'Building C, Floor 1', budget: 450000.0 }
        ]
      },
      employees: {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'first_name', type: 'TEXT' },
          { name: 'last_name', type: 'TEXT' },
          { name: 'email', type: 'TEXT' },
          { name: 'salary', type: 'REAL' },
          { name: 'join_date', type: 'DATE' },
          { name: 'department_id', type: 'INT', foreignKey: { table: 'departments', column: 'id' } },
          { name: 'is_active', type: 'BOOLEAN' }
        ],
        rows: [
          { id: 101, first_name: 'Aditya', last_name: 'Sah', email: 'aditya.sah@company.com', salary: 125000.0, join_date: '2022-01-15', department_id: 1, is_active: true },
          { id: 102, first_name: 'Priya', last_name: 'Sharma', email: 'priya.sharma@company.com', salary: 98000.0, join_date: '2022-03-20', department_id: 2, is_active: true },
          { id: 103, first_name: 'Rahul', last_name: 'Verma', email: 'rahul.verma@company.com', salary: 87000.0, join_date: '2021-11-01', department_id: 1, is_active: true },
          { id: 104, first_name: 'Sneha', last_name: 'Patel', email: 'sneha.patel@company.com', salary: 110000.0, join_date: '2020-06-10', department_id: 3, is_active: true },
          { id: 105, first_name: 'Vikram', last_name: 'Singh', email: 'vikram.singh@company.com', salary: 65000.0, join_date: '2023-02-01', department_id: 4, is_active: true },
          { id: 106, first_name: 'Ananya', last_name: 'Roy', email: 'ananya.roy@company.com', salary: 92000.0, join_date: '2021-08-14', department_id: 5, is_active: true },
          { id: 107, first_name: 'Rohan', last_name: 'Gupta', email: 'rohan.gupta@company.com', salary: 78000.0, join_date: '2022-09-01', department_id: 2, is_active: true },
          { id: 108, first_name: 'Kavya', last_name: 'Nair', email: 'kavya.nair@company.com', salary: 48000.0, join_date: '2023-05-15', department_id: 6, is_active: false },
          { id: 109, first_name: 'Amit', last_name: 'Kumar', email: 'amit.kumar@company.com', salary: 135000.0, join_date: '2019-04-01', department_id: 1, is_active: true },
          { id: 110, first_name: 'Neha', last_name: 'Joshi', email: 'neha.joshi@company.com', salary: 89000.0, join_date: '2022-12-10', department_id: 3, is_active: true }
        ]
      }
    }
  },

  ecommerce_store: {
    name: 'E-Commerce Store',
    tables: {
      categories: {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'category_name', type: 'TEXT' },
          { name: 'description', type: 'TEXT' }
        ],
        rows: [
          { id: 1, category_name: 'Electronics', description: 'Gadgets, laptops, smartphones and accessories' },
          { id: 2, category_name: 'Books & Learning', description: 'Technical books, textbooks and courses' },
          { id: 3, category_name: 'Clothing', description: 'Men, women and kids fashion' },
          { id: 4, category_name: 'Home & Kitchen', description: 'Appliances, cookware and home decor' }
        ]
      },
      products: {
        name: 'products',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'product_name', type: 'TEXT' },
          { name: 'category_id', type: 'INT', foreignKey: { table: 'categories', column: 'id' } },
          { name: 'price', type: 'REAL' },
          { name: 'stock_quantity', type: 'INT' },
          { name: 'rating', type: 'REAL' }
        ],
        rows: [
          { id: 1, product_name: 'Pro Developer Laptop', category_id: 1, price: 1299.99, stock_quantity: 45, rating: 4.8 },
          { id: 2, product_name: 'Wireless Mechanical Keyboard', category_id: 1, price: 119.50, stock_quantity: 120, rating: 4.6 },
          { id: 3, product_name: '4K Ultra-Wide Monitor', category_id: 1, price: 449.00, stock_quantity: 30, rating: 4.7 },
          { id: 4, product_name: 'Mastering SQL & Relational DBs', category_id: 2, price: 49.99, stock_quantity: 200, rating: 4.9 },
          { id: 5, product_name: 'System Design Interview Guide', category_id: 2, price: 39.99, stock_quantity: 150, rating: 4.8 },
          { id: 6, product_name: 'Developer Hoodie (Dark Mode)', category_id: 3, price: 59.00, stock_quantity: 80, rating: 4.5 },
          { id: 7, product_name: 'Ergonomic Office Chair', category_id: 4, price: 299.00, stock_quantity: 25, rating: 4.4 },
          { id: 8, product_name: 'Smart Coffee Maker', category_id: 4, price: 89.99, stock_quantity: 60, rating: 4.3 }
        ]
      },
      customers: {
        name: 'customers',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'name', type: 'TEXT' },
          { name: 'city', type: 'TEXT' },
          { name: 'country', type: 'TEXT' },
          { name: 'signup_date', type: 'DATE' }
        ],
        rows: [
          { id: 1, name: 'Aarav Mehta', city: 'Mumbai', country: 'India', signup_date: '2023-01-10' },
          { id: 2, name: 'Sophia Chen', city: 'San Francisco', country: 'USA', signup_date: '2023-02-14' },
          { id: 3, name: 'Liam Wilson', city: 'London', country: 'UK', signup_date: '2023-03-01' },
          { id: 4, name: 'Diya Rao', city: 'Bengaluru', country: 'India', signup_date: '2023-03-25' },
          { id: 5, name: 'Mateo Garcia', city: 'Madrid', country: 'Spain', signup_date: '2023-04-12' }
        ]
      },
      orders: {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'customer_id', type: 'INT', foreignKey: { table: 'customers', column: 'id' } },
          { name: 'order_date', type: 'DATE' },
          { name: 'total_amount', type: 'REAL' },
          { name: 'status', type: 'TEXT' }
        ],
        rows: [
          { id: 501, customer_id: 1, order_date: '2023-05-01', total_amount: 1419.49, status: 'DELIVERED' },
          { id: 502, customer_id: 2, order_date: '2023-05-03', total_amount: 498.99, status: 'DELIVERED' },
          { id: 503, customer_id: 3, order_date: '2023-05-10', total_amount: 49.99, status: 'SHIPPED' },
          { id: 504, customer_id: 4, order_date: '2023-05-12', total_amount: 358.00, status: 'DELIVERED' },
          { id: 505, customer_id: 1, order_date: '2023-05-18', total_amount: 59.00, status: 'PROCESSING' },
          { id: 506, customer_id: 5, order_date: '2023-05-20', total_amount: 1299.99, status: 'DELIVERED' }
        ]
      },
      order_items: {
        name: 'order_items',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'order_id', type: 'INT', foreignKey: { table: 'orders', column: 'id' } },
          { name: 'product_id', type: 'INT', foreignKey: { table: 'products', column: 'id' } },
          { name: 'quantity', type: 'INT' },
          { name: 'unit_price', type: 'REAL' }
        ],
        rows: [
          { id: 1001, order_id: 501, product_id: 1, quantity: 1, unit_price: 1299.99 },
          { id: 1002, order_id: 501, product_id: 2, quantity: 1, unit_price: 119.50 },
          { id: 1003, order_id: 502, product_id: 3, quantity: 1, unit_price: 449.00 },
          { id: 1004, order_id: 502, product_id: 4, quantity: 1, unit_price: 49.99 },
          { id: 1005, order_id: 503, product_id: 4, quantity: 1, unit_price: 49.99 },
          { id: 1006, order_id: 504, product_id: 6, quantity: 1, unit_price: 59.00 },
          { id: 1007, order_id: 504, product_id: 7, quantity: 1, unit_price: 299.00 },
          { id: 1008, order_id: 505, product_id: 6, quantity: 1, unit_price: 59.00 },
          { id: 1009, order_id: 506, product_id: 1, quantity: 1, unit_price: 1299.99 }
        ]
      }
    }
  },

  university_system: {
    name: 'University System',
    tables: {
      instructors: {
        name: 'instructors',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'name', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
          { name: 'title', type: 'TEXT' }
        ],
        rows: [
          { id: 1, name: 'Dr. Robert Miller', department: 'Computer Science', title: 'Professor' },
          { id: 2, name: 'Dr. Anita Desai', department: 'Computer Science', title: 'Associate Professor' },
          { id: 3, name: 'Prof. David Clark', department: 'Mathematics', title: 'Department Head' },
          { id: 4, name: 'Dr. Sarah Connor', department: 'Data Science', title: 'Assistant Professor' }
        ]
      },
      courses: {
        name: 'courses',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'course_code', type: 'TEXT' },
          { name: 'course_name', type: 'TEXT' },
          { name: 'credits', type: 'INT' },
          { name: 'instructor_id', type: 'INT', foreignKey: { table: 'instructors', column: 'id' } }
        ],
        rows: [
          { id: 101, course_code: 'CS101', course_name: 'Introduction to Computer Science', credits: 4, instructor_id: 1 },
          { id: 102, course_code: 'CS202', course_name: 'Data Structures & Algorithms', credits: 4, instructor_id: 2 },
          { id: 103, course_code: 'DB301', course_name: 'Database Management Systems', credits: 3, instructor_id: 2 },
          { id: 104, course_code: 'MATH150', course_name: 'Linear Algebra & Calculus', credits: 4, instructor_id: 3 },
          { id: 105, course_code: 'DS401', course_name: 'Applied Machine Learning', credits: 3, instructor_id: 4 }
        ]
      },
      students: {
        name: 'students',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'name', type: 'TEXT' },
          { name: 'major', type: 'TEXT' },
          { name: 'enrollment_year', type: 'INT' },
          { name: 'gpa', type: 'REAL' }
        ],
        rows: [
          { id: 202101, name: 'Ishaan Sharma', major: 'Computer Science', enrollment_year: 2021, gpa: 3.85 },
          { id: 202102, name: 'Zara Khan', major: 'Data Science', enrollment_year: 2021, gpa: 3.92 },
          { id: 202201, name: 'Karan Kapoor', major: 'Computer Science', enrollment_year: 2022, gpa: 3.40 },
          { id: 202202, name: 'Elena Rostova', major: 'Mathematics', enrollment_year: 2022, gpa: 3.75 },
          { id: 202301, name: 'Tanya Sengupta', major: 'Computer Science', enrollment_year: 2023, gpa: 3.60 }
        ]
      },
      enrollments: {
        name: 'enrollments',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'student_id', type: 'INT', foreignKey: { table: 'students', column: 'id' } },
          { name: 'course_id', type: 'INT', foreignKey: { table: 'courses', column: 'id' } },
          { name: 'semester', type: 'TEXT' }
        ],
        rows: [
          { id: 1, student_id: 202101, course_id: 102, semester: 'Fall 2022' },
          { id: 2, student_id: 202101, course_id: 103, semester: 'Spring 2023' },
          { id: 3, student_id: 202102, course_id: 103, semester: 'Spring 2023' },
          { id: 4, student_id: 202102, course_id: 105, semester: 'Fall 2023' },
          { id: 5, student_id: 202201, course_id: 101, semester: 'Fall 2022' },
          { id: 6, student_id: 202202, course_id: 104, semester: 'Fall 2022' },
          { id: 7, student_id: 202301, course_id: 101, semester: 'Fall 2023' }
        ]
      },
      grades: {
        name: 'grades',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'enrollment_id', type: 'INT', foreignKey: { table: 'enrollments', column: 'id' } },
          { name: 'grade_letter', type: 'TEXT' },
          { name: 'score', type: 'REAL' }
        ],
        rows: [
          { id: 1, enrollment_id: 1, grade_letter: 'A', score: 94.5 },
          { id: 2, enrollment_id: 2, grade_letter: 'A+', score: 98.0 },
          { id: 3, enrollment_id: 3, grade_letter: 'A', score: 95.0 },
          { id: 4, enrollment_id: 4, grade_letter: 'A', score: 92.0 },
          { id: 5, enrollment_id: 5, grade_letter: 'B+', score: 87.5 },
          { id: 6, enrollment_id: 6, grade_letter: 'A', score: 91.0 },
          { id: 7, enrollment_id: 7, grade_letter: 'B', score: 83.0 }
        ]
      }
    }
  },

  tech_startup: {
    name: 'Tech Startup Metrics',
    tables: {
      users: {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'username', type: 'TEXT' },
          { name: 'company', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
          { name: 'created_at', type: 'TIMESTAMP' }
        ],
        rows: [
          { id: 1, username: 'alex_dev', company: 'Acme Corp', role: 'CTO', created_at: '2023-01-05 10:30:00' },
          { id: 2, username: 'sarah_pm', company: 'Innovate LLC', role: 'Lead PM', created_at: '2023-01-12 14:15:00' },
          { id: 3, username: 'mark_data', company: 'Acme Corp', role: 'Data Engineer', created_at: '2023-02-01 09:00:00' },
          { id: 4, username: 'lisa_founder', company: 'Alpha Labs', role: 'CEO', created_at: '2023-02-20 16:45:00' },
          { id: 5, username: 'david_arch', company: 'Cloud Scale', role: 'Architect', created_at: '2023-03-10 11:20:00' }
        ]
      },
      subscriptions: {
        name: 'subscriptions',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'user_id', type: 'INT', foreignKey: { table: 'users', column: 'id' } },
          { name: 'plan_name', type: 'TEXT' },
          { name: 'monthly_rate', type: 'REAL' },
          { name: 'status', type: 'TEXT' },
          { name: 'start_date', type: 'DATE' }
        ],
        rows: [
          { id: 1, user_id: 1, plan_name: 'Enterprise Pro', monthly_rate: 499.00, status: 'ACTIVE', start_date: '2023-01-05' },
          { id: 2, user_id: 2, plan_name: 'Team Tier', monthly_rate: 149.00, status: 'ACTIVE', start_date: '2023-01-12' },
          { id: 3, user_id: 3, plan_name: 'Developer Tier', monthly_rate: 29.00, status: 'ACTIVE', start_date: '2023-02-01' },
          { id: 4, user_id: 4, plan_name: 'Enterprise Pro', monthly_rate: 499.00, status: 'ACTIVE', start_date: '2023-02-20' },
          { id: 5, user_id: 5, plan_name: 'Free Trial', monthly_rate: 0.00, status: 'EXPIRED', start_date: '2023-03-10' }
        ]
      },
      feature_usage: {
        name: 'feature_usage',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'user_id', type: 'INT', foreignKey: { table: 'users', column: 'id' } },
          { name: 'feature_name', type: 'TEXT' },
          { name: 'api_calls_count', type: 'INT' },
          { name: 'last_used', type: 'TIMESTAMP' }
        ],
        rows: [
          { id: 101, user_id: 1, feature_name: 'SQL Query Runner', api_calls_count: 1450, last_used: '2023-05-20 18:30:00' },
          { id: 102, user_id: 1, feature_name: 'AI Code Assistant', api_calls_count: 820, last_used: '2023-05-20 19:10:00' },
          { id: 103, user_id: 2, feature_name: 'SQL Query Runner', api_calls_count: 310, last_used: '2023-05-19 12:00:00' },
          { id: 104, user_id: 3, feature_name: 'Data Exporter', api_calls_count: 540, last_used: '2023-05-20 14:22:00' },
          { id: 105, user_id: 4, feature_name: 'AI Code Assistant', api_calls_count: 1980, last_used: '2023-05-20 20:05:00' }
        ]
      },
      payments: {
        name: 'payments',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true },
          { name: 'subscription_id', type: 'INT', foreignKey: { table: 'subscriptions', column: 'id' } },
          { name: 'amount', type: 'REAL' },
          { name: 'payment_date', type: 'DATE' },
          { name: 'payment_method', type: 'TEXT' }
        ],
        rows: [
          { id: 5001, subscription_id: 1, amount: 499.00, payment_date: '2023-02-05', payment_method: 'Corporate Credit Card' },
          { id: 5002, subscription_id: 1, amount: 499.00, payment_date: '2023-03-05', payment_method: 'Corporate Credit Card' },
          { id: 5003, subscription_id: 2, amount: 149.00, payment_date: '2023-02-12', payment_method: 'Stripe Direct' },
          { id: 5004, subscription_id: 3, amount: 29.00, payment_date: '2023-03-01', payment_method: 'PayPal' },
          { id: 5005, subscription_id: 4, amount: 499.00, payment_date: '2023-03-20', payment_method: 'Wire Transfer' }
        ]
      }
    }
  }
};
