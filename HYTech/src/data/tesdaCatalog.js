// src/data/tesdaCatalog.js
// Full TESDA Online Program taxonomy: Sector → Program → Subjects.
//
// In this LMS the levels map as follows:
//   Sector   → `sectors` collection (top-level category)
//   Program  → `courses` collection ("course template" a trainer turns into a class)
//   Subject  → an editable module template stored on the program (`subjects[]`);
//              copied into a class's `modules` subcollection when a class is created.
//
// Programs are seeded with `available: false` — an admin must enable a program
// before trainers can offer it (see seedTesdaCatalog in firestoreService).

export const TESDA_CATALOG = [
  {
    sector: '21st Century Skills',
    programs: [
      {
        name: 'Communication',
        subjects: [
          'Participating in Workplace Communication',
          'Receiving and Responding to Workplace Communication',
        ],
      },
      {
        name: 'Language Literacy',
        subjects: [
          'English for Business and Entrepreneurship',
          'Using Educational Technology in the English Language Classroom',
          'English as a Medium of Instruction',
          'English for Science, Technology, Engineering, and Mathematics (eSTEM)',
          'English for Tourism Professionals',
        ],
      },
      {
        name: 'Environmental Literacy',
        subjects: [
          'Developing Awareness on Circular Economy Principles and Practices',
          'Exercising Sustainable Development in the Workplace',
          'Orienting Oneself to Environmentally Sustainable Work Standards',
          'Performing Solid Waste Management in the Workplace',
        ],
      },
      {
        name: 'Digital Literacy',
        subjects: [
          'Microsoft Digital Literacy',
          'Practicing Data Privacy in the Workplace',
          'Wi-Fi 101 and Digital Thumbprint Program',
        ],
      },
      {
        name: 'Khan Academy',
        subjects: ['TESDA Information Management'],
      },
      {
        name: 'HP LIFE',
        subjects: ['HP LIFE Courses'],
      },
      {
        name: 'Job Ready Courses',
        subjects: [
          'Impactful Writing Skills',
          'Self-Presentation',
          'Self-Management',
          'Interpersonal Skills',
          'Problem Solving & Innovation',
          'Professionalism',
          'Customer Centricity',
        ],
      },
    ],
  },
  {
    sector: 'Agriculture',
    programs: [
      {
        name: 'Agro-Entrepreneurship NC II',
        subjects: [
          'Introduction to Agro-Entrepreneurship',
          'Assessing Market Opportunities',
          'Establishing the Farm Production Plan',
          'Handling Finances',
          'Marketing Farm Produce',
        ],
      },
      {
        name: 'Aquaponic Food Production',
        subjects: [
          'Introduction to Aquaponic Food Production',
          'Setting Up Aquaponics Systems',
          'Maintaining Aquaponics Systems',
        ],
      },
      {
        name: 'Organic Agriculture Production NC II',
        subjects: [
          'Introduction to Organic Agriculture',
          'Formulating Organic Concoctions & Extracts',
          'Producing Organic Fertilizers',
          'Producing Organic Vegetables',
          'Raising Organic Chickens',
        ],
      },
      {
        name: 'Agricultural Crops Production NC II',
        subjects: [
          'Introduction to Agricultural Crops Production',
          'Performing Nursery Operations',
          'Planting Crops',
          'Caring and Maintaining Crops',
          'Performing Harvest and Postharvest Operations',
        ],
      },
      {
        name: 'Fruit Growing',
        subjects: ['Fruit Grower'],
      },
      {
        name: 'Agro-Entrepreneurship NC III',
        subjects: [
          'Introduction to Agroentrepreneurship',
          'Engaging Agroenterprise (AE) Industry Stakeholders',
          'Ensuring Product Supply',
          'Implementing Financial Management',
          'Mobilizing Farmers Participation in Capacity Building Activities',
          'Conducting Collective Marketing',
        ],
      },
    ],
  },
  {
    sector: 'Automotive and Land Transport',
    programs: [
      {
        name: 'Automotive Servicing (Engine Repair) NC II',
        subjects: [
          'Introduction to Automotive Servicing',
          'Performing Periodic Maintenance of the Automotive Engine',
          'Diagnosing and Repairing Engine Cooling and Lubricating System',
          'Diagnosing and Repairing Intake and Exhaust Systems',
          'Diagnosing and Overhauling Engine Mechanical Systems',
        ],
      },
    ],
  },
  {
    sector: 'Construction',
    programs: [
      {
        name: 'Plumbing NC II',
        subjects: [
          'Introduction to Plumbing',
          'Preparing Estimation of Materials for Multiple Plumbing Units',
          'Performing Multiple Plumbing Units Installation and Assembly',
          'Performing Leak Testing',
          'Performing Plumbing Repair and Maintenance Work',
        ],
      },
      {
        name: 'Photovoltaic Systems Installation NC II',
        subjects: [
          'Introduction to Photovoltaic Systems Installation',
          'Performing Site Assessment',
          'Checking PV Components and Materials Compliance',
          'Installing Photovoltaic Systems',
          'Performing PV System Testing and Commissioning',
        ],
      },
      {
        name: 'Technical Drafting NC II',
        subjects: [
          'Introduction to Technical Drafting',
          'Drafting Architectural Layout and Details',
          'Preparing Computer-Aided Drawings',
          'Drafting Structural Layout and Details',
          'Drafting Electrical and Electronic Layout and Details',
          'Drafting Sanitary and Plumbing Layout and Details',
          'Drafting Mechanical Layout and Details',
        ],
      },
    ],
  },
  {
    sector: 'Electrical and Electronics',
    programs: [
      {
        name: 'Computer System Servicing NC II',
        subjects: [
          'Introduction to CSS',
          'Installing and Configuring Computer Systems',
          'Setting Up Computer Networks',
          'Setting Up Computer Servers',
          'Maintaining Computer Systems and Networks',
        ],
      },
      {
        name: 'Electrical Installation and Maintenance NC II',
        subjects: [
          'Introduction to Electrical Installation and Maintenance',
          'Performing Roughing-In Activities, Wiring and Cabling Works for Single-Phase Distribution, Power, Lighting and Auxiliary Systems',
          'Installing Electrical Protective Devices for Distribution, Power, Lightning Protection and Grounding Systems',
          'Installing Wiring Devices for Floor and Wall-Mounted Outlets, Lighting Fixtures, Switches and Auxiliary Outlets',
        ],
      },
      {
        name: 'Renewable/Alternative Energy',
        subjects: ['Solar Night Light Assembly'],
      },
    ],
  },
  {
    sector: 'Entrepreneurship',
    programs: [
      {
        name: 'iSTAR Program',
        subjects: [
          'Building Business Mindset',
          'Planning the Business',
          'Managing Business Operation',
          'Ensuring Business Sustainability and Success',
          'Basic E-Commerce Using Social Media under the iSTAR Program in Partnership with Coca-Cola Philippines',
          'Access to Business Coaching, Resources and Peer Mentoring',
        ],
      },
      {
        name: 'OFW RISE',
        subjects: ['Start and Improve Your Business'],
      },
      {
        name: 'Entrepreneurship',
        subjects: ['Establishing & Operating Micro-Small Medium Enterprises (MSMEs)'],
      },
    ],
  },
  {
    sector: 'Gender and Development (GAD)',
    programs: [
      {
        name: 'Gender and Development (GAD)',
        subjects: [
          'Working in a Gender-Diverse Environment',
          'Conducting Gender Analysis, Mainstreaming, and Planning and Budgeting',
        ],
      },
    ],
  },
  {
    sector: 'Halal Awareness Program',
    programs: [
      {
        name: 'Halal Awareness Program',
        subjects: ['Developing Awareness on Halal Principles and Practices'],
      },
    ],
  },
  {
    sector: 'Heating, Ventilating, Airconditioning and Refrigeration Technology',
    programs: [
      {
        name: 'Refrigeration and Airconditioning Servicing (DOMRAC)',
        subjects: ['Packaged Air Conditioner Unit Servicing'],
      },
      {
        name: 'Commercial Air-Conditioning Installation and Servicing NC III',
        subjects: ['Installing Commercial Air-Conditioning Units'],
      },
    ],
  },
  {
    sector: 'Human Health/Health Care',
    programs: [
      {
        name: 'Barangay Health Services NC II',
        subjects: [
          'Introduction to Barangay Health Services',
          'Assisting Household to Identify Health Problems and Promote Health and Well-Being',
          'Sharing Knowledge and Skills Among Members to Provide Information, Education and Communication and Household Teaching in Disease Prevention and Control',
          'Monitoring Health Status of Household Members under Your Area of Service Coverage',
          'Safekeeping of Equipment, Medical Supplies and Materials in Health Station',
          'Maintaining Updated List/Record of Health Activities',
        ],
      },
      {
        name: 'Massage Therapy NC II',
        subjects: [
          'Foundations of Massage Practice',
          'Fundamentals of Massage Therapy',
          'Performing Shiatsu',
          'Performing Swedish Massage',
        ],
      },
      {
        name: 'Caregiving (Elderly) NC II',
        subjects: [
          'Introduction to Caregiving',
          'Developing the Ability to Recognize Aging Process',
          "Participating in the Implementation and Monitoring of Client's Care Plan",
          'Performing Caring Skills',
          'Performing Specialty Care Procedures',
          'Assisting Client in Administering Prescribed Medication',
        ],
      },
      {
        name: 'Contact Tracing NC II',
        subjects: [
          'Introduction to Contact Tracing',
          'Conducting Case Investigation and Contact Identification',
          'Profiling Close Contacts',
          'Conducting Health Education Program',
          'Performing Data Recording and Reporting',
          'Conducting Monitoring and Surveillance',
        ],
      },
      {
        name: 'Barangay Infectious Disease Management Services Level II',
        subjects: [
          'Introduction to Barangay Infectious Disease Management',
          'Disseminating Preventive Measures in Infectious Disease Transmission and the Importance of Immunization',
          'Assisting in the Management of Infectious Disease in Different Settings',
        ],
      },
      {
        name: 'Practicing COVID-19 Preventive Measures in the Workplace',
        subjects: ['Practicing COVID-19 Preventive Measures in the Workplace'],
      },
    ],
  },
  {
    sector: 'Information and Communication Technology',
    programs: [
      {
        name: 'Visual Graphic Design NC III',
        subjects: [
          'Introduction to Visual Graphic Design',
          'Developing Designs for a Logo',
          'Developing Designs for Print Media',
          'Developing Designs for User Experience',
          'Developing Designs for User Interface',
          'Developing Designs for Product Packaging',
          'Designing Booth and Product/Window Display',
        ],
      },
      {
        name: 'Content Creation (Social Media) Level III',
        subjects: [
          'Introduction to Content Creation',
          'Creating Concepts for Social Media',
          'Translating Concepts into Multimedia Contents',
          'Propagating Content',
        ],
      },
      {
        name: 'Digital Marketing Level III',
        subjects: [
          'Introduction to Digital Marketing',
          'Designing a Digital Marketing Funnel',
          'Designing a Campaign Creative Brief',
          'Creating Content',
          'Optimizing Digital Marketing Campaign',
          'Conducting Data Analysis',
        ],
      },
      {
        name: 'Information and Communication Technology',
        subjects: [
          'Microsoft Cybersecurity Course: Security, Compliance, and Identity Fundamentals',
          'Microsoft Artificial Intelligence Course: Azure AI Fundamentals',
          'IBM SkillsBuild',
        ],
      },
    ],
  },
  {
    sector: 'Language',
    programs: [
      {
        name: 'Japanese Language A1 Level',
        subjects: ['Using Familiar Everyday Expressions and Very Basic Phrases in Japanese'],
      },
      {
        name: 'English Language A2 Level',
        subjects: ['Using English Expressions Related to Areas of Most Immediate Relevance'],
      },
    ],
  },
  {
    sector: 'Lifelong Learning Skills',
    programs: [
      {
        name: 'Personal Financial Management Courses',
        subjects: [
          'Financial Planning',
          'Budgeting and Saving',
          'Debt Management',
          'Basics of Investing',
          'Fraud and Scam Prevention',
          'Financial Consumer Protection',
          'Digital Financial Literacy',
          'Personal Equity and Retirement Account',
          "The BSP's Role in the Economy",
        ],
      },
      {
        name: 'Skills to Succeed Academy',
        subjects: ['Skills to Succeed Academy'],
      },
    ],
  },
  {
    sector: 'Maritime',
    programs: [
      {
        name: "Ships' Catering",
        subjects: ["Ships' Catering NC III (Updates)"],
      },
    ],
  },
  {
    sector: 'Process Food and Beverages',
    programs: [
      {
        name: 'Food Processing NC II',
        subjects: [
          'Introduction to Food Processing',
          'Processing Food by Drying and Dehydration',
          'Processing Food by Fermentation and Pickling',
          'Processing Food by Salting, Curing, and Smoking',
          'Processing Food by Sugar Concentration',
          'Processing Food by Thermal Application',
        ],
      },
    ],
  },
  {
    sector: 'Social, Community Development and Others',
    programs: [
      {
        name: 'Beauty Care (Nail Care) Services NC II',
        subjects: ['Beauty Care Services (Nail Care) NC II'],
      },
      {
        name: 'Domestic Work NC II',
        subjects: [
          'Introduction to Domestic Service',
          'Cleaning Rooms and Kitchen',
          'Washing and Ironing Clothes and Linens',
          'Preparing Hot and Cold Meals',
          'Providing Food and Beverage Service',
        ],
      },
      {
        name: 'Bookkeeping NC III',
        subjects: [
          'Introduction to Bookkeeping',
          'Journalizing Transactions',
          'Posting Transactions',
          'Preparing Trial Balance',
          'Preparing Financial Reports',
          'Reviewing Internal Control System',
        ],
      },
      {
        name: 'Early Childhood Care and Development Services NC III',
        subjects: [
          'Introduction to Early Childhood Care and Development Services',
          'Managing Center Operations',
          'Conducting Assessment on Progress and Development of Children',
          'Implementing the Early Childhood Care and Development Curriculum',
        ],
      },
      {
        name: 'Bookkeeping for Sangguniang Kabataan (SK) Financial Transactions NC II',
        subjects: [
          'Introduction to Bookkeeping for Sangguniang Kabataan Financial Transactions',
          'Maintaining Records of Financial Transactions',
          'Handling Disbursement',
          'Processing Procurement, and Inventory of Supplies, Materials, and Equipment',
        ],
      },
    ],
  },
  {
    sector: 'Tourism',
    programs: [
      {
        name: 'Bread and Pastry Production NC II',
        subjects: ['Preparing Cakes'],
      },
      {
        name: 'Cookery NC II',
        subjects: [
          'Fundamentals of Professional Cookery',
          'Preparing Stocks, Sauces, and Soup',
          'Preparing Egg, Vegetable and Farinaceous Dishes',
          'Preparing Seafood Dishes',
          'Preparing Poultry and Game Dishes',
          'Preparing Meat Dishes',
          'Preparing Sandwiches',
          'Preparing Salads and Salad Dressings',
          "Preparing Appetizers and Hors d'oeuvres",
          'Preparing Desserts (Updated)',
        ],
      },
      {
        name: 'Food and Beverage Services NC II',
        subjects: [
          'Introduction to Food and Beverage Services',
          'Providing Room Service',
          'Providing Table Service',
        ],
      },
      {
        name: 'Front Office Services NC II',
        subjects: [
          'Introduction to Front Office Services',
          'Providing Front Office Services',
        ],
      },
      {
        name: 'Housekeeping NC II',
        subjects: [
          'Providing Housekeeping Services',
          'Deal with Intoxicated Guests',
          'Providing Guest Room Services',
          'Providing Laundry Services to Guests',
          'Providing Public Area Services',
          'Providing Valet Services',
        ],
      },
    ],
  },
  {
    sector: 'TVET',
    programs: [
      {
        name: 'Trainers Methodology I',
        subjects: [
          'Supervising Work-Based Learning',
          'Utilizing Electronic Media in Facilitating Training',
          'Maintaining Training Facilities',
          'Planning Training Session',
          'Conducting Competency Assessment',
        ],
      },
      {
        name: 'Trainers Methodology II',
        subjects: ['Developing Training Curriculum'],
      },
    ],
  },
  {
    sector: 'TOP Courses with Accessibility Features',
    programs: [
      {
        name: 'Bread and Pastry Production NC II',
        subjects: ['Preparing Cakes – TOP CAF'],
      },
      {
        name: 'Food Processing NC II',
        subjects: [
          'Introduction to Food Processing – TOP CAF',
          'Processing Food by Drying and Dehydration – TOP CAF',
          'Processing Food by Sugar Concentration – TOP CAF',
          'Processing Food by Fermentation and Pickling – CAF',
          'Processing Food by Thermal Application – TOP CAF',
          'Processing Food by Salting, Curing, and Smoking – TOP CAF',
        ],
      },
    ],
  },
  {
    sector: 'International Labour Organization (ILO) Online Courses',
    programs: [
      {
        name: 'Job Readiness Courses (New)',
        subjects: [
          'Module 1: Crafting Your Career',
          'Module 2: Your Guide to Job Readiness',
          'Module 3: Building Human Skills for Career Success',
        ],
      },
      {
        name: 'STEM in TVET Workshop',
        subjects: ['Learner-Centred STEM in TVET'],
      },
    ],
  },
];

/**
 * Derive an NC / Level tag from a program name, e.g.
 *   "Plumbing NC II"                 → "NC II"
 *   "Digital Marketing Level III"    → "Level III"
 *   "Japanese Language A1 Level"     → "A1"
 *   "Communication"                  → "" (no formal level)
 */
export const parseLevel = (programName = '') => {
  const nc = programName.match(/\bNC\s+(IV|III|II|I)\b/);
  if (nc) return `NC ${nc[1]}`;
  const lvl = programName.match(/\bLevel\s+(IV|III|II|I)\b/);
  if (lvl) return `Level ${lvl[1]}`;
  const cefr = programName.match(/\b([ABC][12])\b/);
  if (cefr) return cefr[1];
  return '';
};

/** Total program + subject counts, handy for confirmation UI. */
export const catalogTotals = () =>
  TESDA_CATALOG.reduce(
    (acc, s) => {
      acc.sectors += 1;
      acc.programs += s.programs.length;
      acc.subjects += s.programs.reduce((n, p) => n + p.subjects.length, 0);
      return acc;
    },
    { sectors: 0, programs: 0, subjects: 0 }
  );
