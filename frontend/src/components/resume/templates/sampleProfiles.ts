import { ResumeData, TemplateId } from '../../../types/resume';

/**
 * 100% Fictional Realistic Sample Profiles for Overleaf-Style Template Gallery Previews.
 * PRIVACY LOCK: Under no circumstances are user personal details (name, college, real projects) used.
 */

// 1. Alex Morgan — Senior Full-Stack & Distributed Systems Engineer
export const ALEX_MORGAN_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Alex Morgan',
    professionalTitle: 'Senior Full-Stack & Distributed Systems Engineer',
    email: 'alex.morgan.dev@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexmorgan-dev',
    github: 'github.com/alexmorgan-code',
    portfolio: 'alexmorgan.dev',
  },
  summary:
    'Senior Full-Stack & Systems Engineer with 6+ years architecting high-throughput microservices, cloud-native distributed platforms, and responsive web applications. Proven track record leading infrastructure modernizations reducing P99 latency by 42% and processing 15M+ daily transactions. Passionate about developer tooling, API governance, and mentoring junior engineers.',
  education: [
    {
      degree: 'B.S. in Computer Science',
      fieldOfStudy: 'Distributed Systems & Software Engineering',
      institution: 'University of California, Berkeley',
      university: 'UC Berkeley College of Engineering',
      location: 'Berkeley, CA',
      startDate: '2015',
      endDate: '2019',
      year: '2015 - 2019',
      gpa: '3.91 / 4.0 (High Honors)',
      coursework: 'Distributed Systems, Operating Systems, Computer Architecture, Database Design, Cloud Computing',
    },
  ],
  skills: {
    languages: ['Go (Golang)', 'TypeScript', 'Python', 'Java', 'SQL', 'Rust'],
    frameworks: ['React', 'Next.js', 'Node.js', 'FastAPI', 'Spring Boot', 'Tailwind CSS', 'gRPC'],
    tools: ['Docker', 'Kubernetes', 'Terraform', 'Git', 'GitHub Actions', 'Kafka', 'Linux'],
    databases: ['PostgreSQL', 'Redis', 'Apache Cassandra', 'MongoDB'],
    cloud: ['AWS (EKS, Lambda, RDS, S3)', 'GCP (Cloud Run, BigQuery)'],
    other: ['Microservices Architecture', 'System Design', 'CI/CD Pipelines', 'REST & GraphQL APIs'],
  },
  experience: [
    {
      company: 'CloudScale Infrastructure Labs',
      role: 'Senior Software Engineer (Tech Lead)',
      duration: '2021 - Present',
      startDate: '2021',
      endDate: 'Present',
      employmentType: 'Full-time',
      location: 'San Francisco, CA',
      bullets: [
        'Architected an event-driven data streaming ingestion engine in Go and Apache Kafka, handling over 18,000 events/sec with 99.99% uptime.',
        'Migrated legacy monolithic services to containerized Kubernetes microservices on AWS EKS, reducing monthly infrastructure costs by $140,000.',
        'Designed high-speed Redis caching tier for user authorization sessions, lowering P99 read latencies from 180ms down to 14ms.',
        'Led an engineering squad of 7 developers, conducting architecture design reviews and improving code coverage from 64% to 92%.',
      ],
    },
    {
      company: 'Apex Digital Systems',
      role: 'Full-Stack Software Engineer',
      duration: '2019 - 2021',
      startDate: '2019',
      endDate: '2021',
      employmentType: 'Full-time',
      location: 'San Jose, CA',
      bullets: [
        'Built full-stack analytics dashboards in React, TypeScript, and FastAPI consumed by 85,000+ enterprise customers.',
        'Optimized PostgreSQL partitioning and multi-column B-tree indices, boosting analytical query throughput by 3.4x.',
        'Implemented automated end-to-end testing pipelines using Playwright and Docker, decreasing staging regressions by 65%.',
      ],
    },
  ],
  projects: [
    {
      name: 'KubeStream — Distributed Event Orchestrator',
      description: 'Open-source distributed orchestrator designed for seamless horizontal scaling of streaming data transformations across Kubernetes clusters.',
      technologies: ['Go', 'Kubernetes API', 'Apache Kafka', 'Docker', 'Prometheus'],
      link: 'kubestream.dev',
      githubLink: 'github.com/alexmorgan-code/kubestream',
      bullets: [
        'Engineered custom Kubernetes operator in Go to automate cluster provisioning and auto-scaling based on consumer lag.',
        'Achieved sub-15ms processing overhead under sustained simulated load of 50,000 messages per second.',
      ],
    },
    {
      name: 'OmniGraph — Real-Time Cloud Topology Visualizer',
      description: 'Interactive visualization platform mapping complex multi-cloud VPC dependencies, routing tables, and security perimeters in real time.',
      technologies: ['React', 'TypeScript', 'WebGL', 'FastAPI', 'AWS SDK'],
      link: 'omnigraph.cloud',
      githubLink: 'github.com/alexmorgan-code/omnigraph-ui',
      bullets: [
        'Rendered graphs with 10,000+ dynamic nodes at 60fps utilizing WebGL canvas acceleration.',
        'Integrated AWS CloudWatch metrics for instantaneous visual alerting on cross-region latency spikes.',
      ],
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect — Professional',
      issuer: 'Amazon Web Services',
      year: '2023',
      date: '2023 - 2026',
      link: 'aws.amazon.com/verification',
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation (CNCF)',
      year: '2022',
      date: '2022 - 2025',
    },
  ],
  achievements: [
    {
      title: '1st Place Winner — Global Cloud Infrastructure Hackathon',
      description: 'Recognized among 1,200 international engineers for developing an autonomous zero-waste container auto-scaler.',
      date: '2023',
    },
    {
      title: 'UC Berkeley CS Departmental Honors',
      description: 'Awarded for outstanding undergraduate research in distributed fault-tolerant consensus protocols.',
      date: '2019',
    },
  ],
  extracurricular: [
    {
      activity: 'Open-Source Cloud Native Contributor',
      role: 'Active Maintainer',
      description: 'Contributed 40+ merged PRs to CNCF ecosystem repositories focusing on observability and metrics exporters.',
    },
  ],
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'projects',
    'education',
    'certifications',
    'achievements',
    'extracurricular',
  ],
  accentColor: 'slate',
};

// 2. Lucas Bennett — Competitive Programmer & Performance Systems Engineer
export const LUCAS_BENNETT_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Lucas Bennett',
    professionalTitle: 'Competitive Programmer & Low-Latency Systems Engineer',
    email: 'lucas.bennett.dev@example.com',
    phone: '+1 (555) 890-1234',
    location: 'New York, NY',
    linkedin: 'linkedin.com/in/lucas-bennett',
    github: 'github.com/lucas-bennett-cp',
    portfolio: 'lucasbennett.tech',
  },
  summary:
    'Competitive Programmer & High-Performance Systems Engineer with elite algorithmic problem-solving expertise and deep low-level systems knowledge. Codeforces International Grandmaster (Peak 2465, Top 0.05% globally) and ACM-ICPC World Finalist. Specializes in cache-friendly data structures, SIMD vectorization, lock-free concurrency, and kernel-bypass networking in modern C++20 and Rust.',
  education: [
    {
      degree: 'B.S. in Computer Science & Applied Mathematics',
      fieldOfStudy: 'Algorithms, Complexity Theory & Systems',
      institution: 'Carnegie Mellon University',
      university: 'School of Computer Science',
      location: 'Pittsburgh, PA',
      startDate: '2018',
      endDate: '2022',
      year: '2018 - 2022',
      gpa: '3.98 / 4.0 (Dean’s High Honors)',
      coursework: 'Advanced Data Structures, Parallel Computer Architecture, Algorithm Design & Analysis, Compilers, Low-Latency Systems',
    },
  ],
  skills: {
    languages: ['C++20 / C++23', 'Rust', 'C', 'Python', 'x86_64 Assembly', 'SQL'],
    frameworks: ['SIMD (AVX-512)', 'Boost.Asio', 'LLVM', 'Google Benchmark', 'gRPC'],
    tools: ['GDB', 'Valgrind', 'Perf', 'CMake', 'Git', 'Clang-Tidy', 'Linux Kernel Tuning'],
    databases: ['Redis', 'RocksDB', 'SQLite'],
    cloud: ['Bare-Metal Linux HPC', 'AWS c6i (Compute Optimized)'],
    other: ['Lock-Free Concurrency', 'Cache Optimization', 'Algorithmic Game Theory', 'Graph Algorithms'],
  },
  experience: [
    {
      company: 'Aether Quantitative Capital',
      role: 'Quantitative Systems Engineer (C++ / Low-Latency)',
      duration: '2022 - Present',
      startDate: '2022',
      endDate: 'Present',
      employmentType: 'Full-time',
      location: 'New York, NY',
      bullets: [
        'Engineered lock-free market data feed handler in C++20 parsing binary exchange protocols with median latency under 450 nanoseconds.',
        'Vectorized order-book matching algorithms utilizing AVX-512 instructions, achieving a 5.2x speedup over standard scalar implementations.',
        'Eliminated memory allocator jitter by architecting custom arena and slab memory pools with zero dynamic heap allocation in critical paths.',
        'Tuned Linux kernel network stack (DPDK, kernel bypass, CPU pinning, isolcpus) yielding consistent sub-microsecond P99 tick-to-trade latency.',
      ],
    },
    {
      company: 'VectorFlow Systems',
      role: 'High-Performance Computing Intern',
      duration: 'Summer 2021',
      startDate: 'Jun 2021',
      endDate: 'Aug 2021',
      employmentType: 'Internship',
      location: 'Pittsburgh, PA',
      bullets: [
        'Implemented parallelized graph traversal routines (bidirectional Dijkstra & A*) achieving 12M node evaluations per second.',
        'Profiled cache miss rates using Linux Perf hardware counters, refactoring data layout from Array of Structures (AoS) to Structure of Arrays (SoA).',
      ],
    },
  ],
  projects: [
    {
      name: 'AtomicQueue-CPP — Ultra-Fast Lock-Free Queue',
      description: 'Single-Header C++20 bounded lock-free MPMC queue operating with zero cache-line bouncing, reaching 65M operations/sec on consumer hardware.',
      technologies: ['C++20', 'Atomic Intrinsics', 'Google Benchmark', 'CMake'],
      link: 'github.com/lucas-bennett-cp/atomic-queue-cpp',
      githubLink: 'github.com/lucas-bennett-cp/atomic-queue-cpp',
      bullets: [
        'Utilized std::hardware_destructive_interference_size alignment to prevent false sharing across multicore CPU threads.',
        'Verified thread safety and absence of race conditions using ThreadSanitizer and formal verification models.',
      ],
    },
    {
      name: 'FastSIMD-JSON — Microsecond JSON Parsing Library',
      description: 'Experimental parser using SIMD vector instructions to validate structural JSON syntax in single digit gigabytes per second.',
      technologies: ['C++20', 'AVX2 / AVX-512', 'Assembly', 'LLVM'],
      link: 'github.com/lucas-bennett-cp/fast-simd-json',
      githubLink: 'github.com/lucas-bennett-cp/fast-simd-json',
      bullets: [
        'Processed up to 2.8 GB/s on modern x86 cores, outperforming standard rapidjson parser by over 320%.',
      ],
    },
  ],
  certifications: [
    {
      name: 'Codeforces International Grandmaster (Rating: 2465)',
      issuer: 'Codeforces Platform',
      year: '2022',
      date: 'Permanent Rank',
      link: 'codeforces.com/profile/lucas_b',
    },
    {
      name: 'LeetCode Global Rank #8 (Contest Rating: 3240)',
      issuer: 'LeetCode',
      year: '2023',
    },
  ],
  achievements: [
    {
      title: 'ACM-ICPC World Finals Medalist (North American Regional Champion)',
      description: 'Led 3-person collegiate team to 1st place in regional qualifying and advanced to World Finals with solved 11/12 algorithmic problems.',
      date: '2022',
    },
    {
      title: 'Google Code Jam Global Round 3 Finalist',
      description: 'Ranked in the top 25 worldwide among 35,000+ participating software engineers and algorithm specialists.',
      date: '2021',
    },
  ],
  extracurricular: [
    {
      activity: 'CMU Competitive Programming Club',
      role: 'President & Head Coach',
      description: 'Authored weekly algorithmic problem sets and mentored 90+ collegiate students on dynamic programming, segment trees, and flow networks.',
    },
  ],
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'projects',
    'achievements',
    'education',
    'certifications',
    'extracurricular',
  ],
  accentColor: 'emerald',
};

// 3. Dr. Eleanor Vance — Academic Researcher & AI Research Scientist
export const ELEANOR_VANCE_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Dr. Eleanor Vance',
    professionalTitle: 'Postdoctoral Research Scientist in Deep Learning & NLP',
    email: 'e.vance@stanford.edu',
    phone: '+1 (555) 456-7890',
    location: 'Stanford, CA',
    linkedin: 'linkedin.com/in/eleanor-vance-phd',
    github: 'github.com/evance-ai',
    portfolio: 'eleanorvance.ai',
  },
  summary:
    'Artificial Intelligence Researcher and Postdoctoral Fellow specializing in Multimodal Representation Learning, Neural Architecture Search, and Mechanistic Interpretability of Large Language Models. Author of 14 peer-reviewed publications in NeurIPS, ICML, ICLR, and CVPR with 2,400+ citations (h-index: 12). Principal investigator on NSF-sponsored grants focused on robust, hallucination-resistant generative models.',
  education: [
    {
      degree: 'Ph.D. in Computer Science (Artificial Intelligence)',
      fieldOfStudy: 'Deep Learning & Natural Language Understanding',
      institution: 'Stanford University',
      university: 'Stanford AI Lab (SAIL)',
      location: 'Stanford, CA',
      startDate: '2018',
      endDate: '2023',
      year: '2018 - 2023',
      gpa: '4.0 / 4.0',
      coursework: 'Dissertation: "Scalable Cross-Attention Mechanisms in Heterogeneous Vision-Language Transformers"',
    },
    {
      degree: 'B.S. in Mathematics & Computer Science',
      fieldOfStudy: 'Theoretical Computer Science',
      institution: 'Princeton University',
      location: 'Princeton, NJ',
      startDate: '2014',
      endDate: '2018',
      year: '2014 - 2018',
      gpa: '3.97 / 4.0 (Summa Cum Laude)',
    },
  ],
  skills: {
    languages: ['Python', 'C++', 'Julia', 'R', 'LaTeX', 'SQL'],
    frameworks: ['PyTorch', 'JAX', 'Hugging Face', 'Deepspeed', 'Ray', 'vLLM', 'TensorFlow'],
    tools: ['SLURM', 'Weights & Biases', 'Docker', 'CUDA / cuDNN', 'Git', 'Linux HPC'],
    databases: ['Vector Databases (Milvus, Qdrant, FAISS)', 'PostgreSQL'],
    cloud: ['NVIDIA H100 GPU Clusters', 'AWS EC2 (p4de)', 'Google Cloud TPU v4'],
    other: ['Mechanistic Interpretability', 'Transformer Scaling Laws', 'Reinforcement Learning from Human Feedback (RLHF)'],
  },
  experience: [
    {
      company: 'Stanford Artificial Intelligence Laboratory (SAIL)',
      role: 'Postdoctoral Research Scholar',
      duration: '2023 - Present',
      startDate: '2023',
      endDate: 'Present',
      employmentType: 'Fellowship',
      location: 'Stanford, CA',
      bullets: [
        'Leading research team investigating sparse attention approximations that reduce multimodal inference memory consumption by 60%.',
        'Co-directing NSF grant ($1.2M) investigating factual consistency and hallucination detection in 70B+ parameter generative LLMs.',
        'Mentored 5 doctoral and master’s students on publication submissions accepted at ICML and NeurIPS.',
      ],
    },
    {
      company: 'DeepMind Academic Research Collaborative',
      role: 'Visiting Research Scientist',
      duration: '2022 - 2023',
      startDate: '2022',
      endDate: '2023',
      employmentType: 'Contract',
      location: 'Mountain View, CA',
      bullets: [
        'Developed novel latent diffusion routing scheme for cross-modal text-to-video synthesis presented as oral paper at CVPR 2023.',
        'Built distributed training checkpoints across 256 NVIDIA A100 GPUs with linear scaling efficiency up to 94%.',
      ],
    },
  ],
  projects: [
    {
      name: 'OmniAlign — Multimodal Cross-Attention Toolkit',
      description: 'Open-source PyTorch framework implementing state-of-the-art vision-language projection layers with over 4,800 GitHub stars.',
      technologies: ['PyTorch', 'CUDA', 'Hugging Face', 'Triton'],
      link: 'omnialign.ai',
      githubLink: 'github.com/evance-ai/omnialign',
      bullets: [
        'Benchmarked on ImageNet and MMBench demonstrating 4.1% accuracy gain over baseline CLIP projection matrices.',
      ],
    },
    {
      name: 'ProbeLens — Transformer Mechanistic Interpretability Suite',
      description: 'Interactive diagnostic library visualizing attention weight activation circuits and subspace token representations in real time.',
      technologies: ['Python', 'JAX', 'React', 'FastAPI'],
      link: 'probelens.org',
      githubLink: 'github.com/evance-ai/probelens',
      bullets: [
        'Used by 15+ academic research laboratories globally for probing truthfulness circuits in instruction-tuned language models.',
      ],
    },
  ],
  certifications: [
    {
      name: 'NSF Graduate Research Fellowship (GRFP)',
      issuer: 'National Science Foundation',
      year: '2019',
      date: '2019 - 2022',
    },
  ],
  achievements: [
    {
      title: 'Best Paper Award — CVPR 2023',
      description: 'Awarded among 9,100 submitted papers for breakthrough research in token-efficient self-attention mechanisms.',
      date: '2023',
    },
    {
      title: 'Stanford Graduate Fellowship in Science & Engineering',
      description: 'Highest campus-wide honor for doctoral candidates demonstrating exceptional promise in scientific research.',
      date: '2018',
    },
  ],
  extracurricular: [
    {
      activity: 'NeurIPS & ICML Peer Review Committee',
      role: 'Expert Reviewer',
      description: 'Reviewed 30+ conference manuscript submissions annually in neural architecture design and multimodal representation.',
    },
  ],
  sectionOrder: [
    'education',
    'summary',
    'experience',
    'projects',
    'skills',
    'achievements',
    'certifications',
    'extracurricular',
  ],
  accentColor: 'charcoal',
};

// 4. Jordan Reed — Technology Executive & VP of Engineering
export const JORDAN_REED_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Jordan Reed',
    professionalTitle: 'Vice President of Engineering / Head of Technology',
    email: 'jordan.reed.exec@example.com',
    phone: '+1 (555) 789-0123',
    location: 'New York, NY',
    linkedin: 'linkedin.com/in/jordanreed-executive',
    github: 'github.com/jordanreed-tech',
    portfolio: 'jordanreed.io',
  },
  summary:
    'Transformative Technology Executive with 14+ years scaling globally distributed engineering organizations from 25 to 180+ engineers. Proven track record executing enterprise digital transformations, scaling Annual Recurring Revenue (ARR) from $15M to $160M, and modernizing legacy core transactional architectures with zero customer-facing downtime. Recognized for servant leadership, operational rigor, and aligning technology investments with business growth.',
  education: [
    {
      degree: 'M.B.A. in Technology Management & Strategy',
      fieldOfStudy: 'Executive Leadership & Corporate Finance',
      institution: 'Columbia Business School',
      university: 'Columbia University',
      location: 'New York, NY',
      startDate: '2014',
      endDate: '2016',
      year: '2014 - 2016',
      gpa: '3.89 / 4.0',
    },
    {
      degree: 'B.S. in Computer Science & Electrical Engineering',
      fieldOfStudy: 'Software Engineering',
      institution: 'Cornell University',
      location: 'Ithaca, NY',
      startDate: '2006',
      endDate: '2010',
      year: '2006 - 2010',
      gpa: '3.85 / 4.0 (Cum Laude)',
    },
  ],
  skills: {
    languages: ['Enterprise Architecture', 'Go', 'Java', 'Python', 'TypeScript', 'SQL'],
    frameworks: ['Cloud Native Microservices', 'Kafka', 'Spring Cloud', 'Kubernetes', 'Next.js'],
    tools: ['Datadog', 'Snowflake', 'Jira Enterprise', 'Terraform', 'GitOps', 'AWS Console'],
    databases: ['PostgreSQL', 'Amazon Aurora', 'DynamoDB', 'Redis'],
    cloud: ['AWS Multi-Region', 'Azure Enterprise Cloud', 'Hybrid Cloud Architecture'],
    other: [
      'P&L Management ($30M+ Budget)',
      'Engineering Retention (94%)',
      'SOC2 Type II & FedRAMP Compliance',
      'M&A Technical Due Diligence',
      'Agile Transformation at Scale',
    ],
  },
  experience: [
    {
      company: 'EnterpriseScale Cloud Technologies',
      role: 'Vice President of Engineering',
      duration: '2020 - Present',
      startDate: '2020',
      endDate: 'Present',
      employmentType: 'Executive',
      location: 'New York, NY',
      bullets: [
        'Direct 180+ engineers, product managers, and site reliability directors across 4 global tech hubs with a $32M annual operational budget.',
        'Accelerated feature release velocity by 340% by implementing trunk-based development and automated CI/CD deployment rings.',
        'Drove enterprise cloud replatforming saving $3.8M annually in compute costs while achieving 99.995% SLA compliance.',
        'Championed diversity and engineering culture initiatives, boosting employee retention to 94% across consecutive fiscal years.',
      ],
    },
    {
      company: 'Vanguard FinTech Systems',
      role: 'Director of Engineering — Core Banking Platform',
      duration: '2016 - 2020',
      startDate: '2016',
      endDate: '2020',
      employmentType: 'Full-time',
      location: 'Jersey City, NJ',
      bullets: [
        'Supervised 6 engineering squads (55 developers) building high-volume payment processing engines handling $8B in annual transactions.',
        'Obtained SOC2 Type II and ISO 27001 certifications with zero major security findings.',
        'Spearheaded transition from legacy mainframe ledger to event-sourced Aurora PostgreSQL architecture.',
      ],
    },
  ],
  projects: [
    {
      name: 'Enterprise Cloud Modernization Initiative',
      description: 'Complete replatforming of core enterprise banking suite to containerized AWS multi-region infrastructure.',
      technologies: ['Kubernetes', 'AWS Aurora', 'Terraform', 'Kafka', 'Go'],
      bullets: [
        'Accomplished zero downtime migration for 2,400 financial institution clients with automated instant rollback safeguards.',
      ],
    },
  ],
  certifications: [
    {
      name: 'Stanford Executive Program in Leadership & Strategy',
      issuer: 'Stanford Graduate School of Business',
      year: '2022',
    },
    {
      name: 'TOGAF 9 Certified Enterprise Architect',
      issuer: 'The Open Group',
      year: '2018',
    },
  ],
  achievements: [
    {
      title: 'FinTech Executive of the Year Finalist',
      description: 'Nominated for leadership in enterprise resilience and zero-defect cloud migrations.',
      date: '2023',
    },
    {
      title: 'Patented Technology: Distributed Resilient Transaction Journaling',
      description: 'US Patent #10,845,921 for high-speed fault-tolerant distributed ledger replication.',
      date: '2021',
    },
  ],
  extracurricular: [
    {
      activity: 'Tech Leaders Board & Startup Advisory',
      role: 'Advisory Board Member',
      description: 'Advise 3 Series-A enterprise SaaS startups on cloud architecture, executive hiring, and scale-up engineering governance.',
    },
  ],
  sectionOrder: [
    'summary',
    'experience',
    'skills',
    'education',
    'projects',
    'achievements',
    'certifications',
    'extracurricular',
  ],
  accentColor: 'navy',
};

// 5. Maya Lin — Modern Design Technologist & Frontend Architect
export const MAYA_LIN_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Maya Lin',
    professionalTitle: 'Senior Frontend Architect & UI/UX Technologist',
    email: 'maya.lin.design@example.com',
    phone: '+1 (555) 345-6789',
    location: 'Seattle, WA',
    linkedin: 'linkedin.com/in/mayalin-ui',
    github: 'github.com/mayalin-code',
    portfolio: 'mayalin.design',
  },
  summary:
    'Creative Frontend Architect and Design Technologist with 5+ years creating pixel-perfect, accessible, and delightful digital experiences. Deep specialization in React, TypeScript, WebAssembly, and component design systems. Passionate about web performance, micro-interactions, and achieving 100% WCAG AAA accessibility standards.',
  education: [
    {
      degree: 'B.S. in Human-Computer Interaction & Computer Science',
      fieldOfStudy: 'Interactive Systems & Web Technologies',
      institution: 'University of Washington',
      location: 'Seattle, WA',
      startDate: '2016',
      endDate: '2020',
      year: '2016 - 2020',
      gpa: '3.88 / 4.0 (Dean’s List)',
    },
  ],
  skills: {
    languages: ['TypeScript', 'JavaScript (ESNext)', 'HTML5 / Modern CSS', 'Rust (Wasm)', 'Python', 'SQL'],
    frameworks: ['React', 'Next.js', 'Vue.js', 'Tailwind CSS', 'Framer Motion', 'Radix UI', 'Three.js'],
    tools: ['Vite', 'Storybook', 'Figma', 'Playwright', 'Jest', 'Webpack', 'Vercel'],
    databases: ['Supabase', 'PostgreSQL', 'IndexedDB'],
    cloud: ['Cloudflare Workers', 'AWS CloudFront', 'Vercel Edge Functions'],
    other: ['Design Systems', 'Web Performance Optimization', 'WCAG AAA Accessibility', 'Micro-Interactions'],
  },
  experience: [
    {
      company: 'Nova Interactive Studio',
      role: 'Staff Frontend Engineer & Design Systems Lead',
      duration: '2022 - Present',
      startDate: '2022',
      endDate: 'Present',
      employmentType: 'Full-time',
      location: 'Seattle, WA',
      bullets: [
        'Engineered company-wide design system adopted by 22 product teams, cutting new feature UI delivery timelines by 45%.',
        'Optimized core web vitals across client flagship applications, raising Google Lighthouse performance scores from 68 to 99.',
        'Spearheaded keyboard-navigation accessibility refactor ensuring strict WCAG 2.1 AAA compliance across all client portals.',
      ],
    },
    {
      company: 'PixelCraft Digital',
      role: 'UI/UX Frontend Developer',
      duration: '2020 - 2022',
      startDate: '2020',
      endDate: '2022',
      employmentType: 'Full-time',
      location: 'Seattle, WA',
      bullets: [
        'Built interactive WebGL product 3D customizers in React and Three.js with 60fps rendering across mobile devices.',
        'Created high-fidelity motion prototypes in Figma and translated them into smooth Framer Motion production components.',
      ],
    },
  ],
  projects: [
    {
      name: 'CanvasCraft — Browser Vector Graphics Editor',
      description: 'High-performance collaborative vector graphics editor running directly in the browser via React and WebAssembly.',
      technologies: ['React', 'TypeScript', 'WebAssembly', 'Rust', 'Tailwind CSS'],
      link: 'canvascraft.io',
      githubLink: 'github.com/mayalin-code/canvascraft',
      bullets: [
        'Rendered 50,000+ vector paths with sub-16ms latency using custom WebAssembly geometry rasterizer.',
      ],
    },
  ],
  certifications: [
    {
      name: 'Certified Professional in Web Accessibility (CPWA)',
      issuer: 'IAAP (International Association of Accessibility)',
      year: '2023',
    },
  ],
  achievements: [
    {
      title: 'Awwwards Site of the Day & Developer Award',
      description: 'Honored for exceptional technical execution and creative interaction design in modern web applications.',
      date: '2023',
    },
  ],
  extracurricular: [
    {
      activity: 'Seattle Women in Web Design & Engineering',
      role: 'Organizer & Workshop Speaker',
      description: 'Hosted monthly hands-on workshops on Accessible Frontend Engineering and CSS Grid architectures.',
    },
  ],
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'projects',
    'education',
    'achievements',
    'certifications',
    'extracurricular',
  ],
  accentColor: 'indigo',
};

// 6. Daniel Kim — CS Graduate & Junior Software Engineer
export const DANIEL_KIM_PROFILE: ResumeData = {
  personalInfo: {
    fullName: 'Daniel Kim',
    professionalTitle: 'Computer Science Graduate & Junior Software Developer',
    email: 'daniel.kim.cs@example.com',
    phone: '+1 (555) 678-9012',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/danielkim-cs',
    github: 'github.com/danielkim-dev',
    portfolio: 'danielkim.dev',
  },
  summary:
    'Dedicated Computer Science Graduate with strong core foundations in data structures, algorithms, object-oriented software design, and modern web application development. Winner of 2 collegiate hackathons and active contributor to open-source student tools. Experienced in building full-stack applications with React, Node.js, Python, and relational databases. Eager to contribute high code quality to fast-paced engineering teams.',
  education: [
    {
      degree: 'B.S. in Computer Science',
      fieldOfStudy: 'Software Engineering',
      institution: 'University of Texas at Austin',
      location: 'Austin, TX',
      startDate: '2020',
      endDate: '2024',
      year: '2020 - 2024',
      gpa: '3.87 / 4.0 (Dean’s Honor List)',
      coursework: 'Data Structures & Algorithms, Operating Systems, Computer Networks, Database Management Systems, Software Engineering Lab',
    },
  ],
  skills: {
    languages: ['Java', 'Python', 'C++', 'JavaScript', 'TypeScript', 'SQL'],
    frameworks: ['React', 'Node.js', 'Express', 'Spring Boot', 'Tailwind CSS', 'FastAPI'],
    tools: ['Git', 'GitHub', 'Docker', 'Postman', 'Linux', 'VS Code', 'Jest'],
    databases: ['PostgreSQL', 'MySQL', 'MongoDB'],
    cloud: ['AWS (EC2, S3)', 'Vercel'],
    other: ['RESTful APIs', 'Object-Oriented Design', 'Agile / Scrum', 'Unit Testing'],
  },
  experience: [
    {
      company: 'Pioneer Software Labs',
      role: 'Software Engineering Intern',
      duration: 'May 2023 - Aug 2023',
      startDate: 'May 2023',
      endDate: 'Aug 2023',
      employmentType: 'Internship',
      location: 'Austin, TX',
      bullets: [
        'Developed REST API endpoints in Node.js and Express powering customer feedback ingestion for 12,000 active users.',
        'Created automated Jest unit test suites raising backend test coverage from 55% to 83%.',
        'Collaborated with senior software architects in daily standups and bi-weekly sprint planning sessions.',
      ],
    },
    {
      company: 'UT Austin Computer Science Department',
      role: 'Undergraduate Teaching Assistant (Data Structures)',
      duration: 'Jan 2023 - Dec 2023',
      startDate: 'Jan 2023',
      endDate: 'Dec 2023',
      employmentType: 'Part-time',
      location: 'Austin, TX',
      bullets: [
        'Held bi-weekly lab sessions for 75+ sophomore engineering students explaining recursion, trees, graphs, and sorting algorithms.',
        'Graded programming assignments and conducted 1-on-1 code debugging sessions.',
      ],
    },
  ],
  projects: [
    {
      name: 'DevSync — Collaborative Real-Time Code Workspace',
      description: 'Web-based interactive code editor supporting live synchronized multi-user document editing and real-time execution.',
      technologies: ['React', 'Node.js', 'WebSockets', 'Docker', 'Monaco Editor'],
      link: 'devsync-app.demo.com',
      githubLink: 'github.com/danielkim-dev/devsync',
      bullets: [
        'Implemented Operational Transformation algorithm over WebSockets ensuring conflict-free simultaneous editing.',
        'Containerized sandboxed code runner in Docker to safely execute user Python and JavaScript snippets.',
      ],
    },
    {
      name: 'AlgorithmVisualizer — Interactive DSA Animation Tool',
      description: 'Educational web tool visually explaining pathfinding, sorting, and dynamic programming algorithms with step-by-step playback.',
      technologies: ['TypeScript', 'React', 'HTML5 Canvas', 'Tailwind CSS'],
      link: 'algovisualizer.tech',
      githubLink: 'github.com/danielkim-dev/algo-visualizer',
      bullets: [
        'Visualized 15+ classic algorithms including Dijkstra, A*, QuickSort, and Knapsack with custom speed controls.',
      ],
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      year: '2024',
    },
  ],
  achievements: [
    {
      title: '1st Place — UT HackTX Collegiate Hackathon',
      description: 'Built an accessible smart campus navigation web app within 24 hours evaluated among 150 student teams.',
      date: '2023',
    },
    {
      title: 'Departmental Academic Excellence Award',
      description: 'Recognized for consecutive Dean’s Honor List standing across all 4 undergraduate academic years.',
      date: '2024',
    },
  ],
  extracurricular: [
    {
      activity: 'ACM Student Chapter at UT Austin',
      role: 'Technical Events Coordinator',
      description: 'Organized tech talks and coding interview prep workshops featuring guest engineers from tech firms.',
    },
  ],
  sectionOrder: [
    'education',
    'skills',
    'projects',
    'experience',
    'achievements',
    'certifications',
    'extracurricular',
  ],
  accentColor: 'navy',
};

// 7. Clean Initial State for User Resumes (Blank/Neutral Starter)
export const INITIAL_USER_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: '',
    professionalTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  summary: '',
  education: [],
  skills: {
    languages: [],
    frameworks: [],
    tools: [],
    databases: [],
    cloud: [],
    other: [],
  },
  experience: [],
  projects: [],
  certifications: [],
  achievements: [],
  extracurricular: [],
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'projects',
    'education',
    'certifications',
    'achievements',
    'extracurricular',
  ],
  accentColor: 'slate',
};

/**
 * Returns the best fictional sample profile to showcase each template's specific design in the gallery.
 */
export const getSampleDataForTemplate = (templateId: TemplateId): ResumeData => {
  switch (templateId) {
    case 'competitive-programmer':
      return LUCAS_BENNETT_PROFILE;
    case 'academic-research':
      return ELEANOR_VANCE_PROFILE;
    case 'corporate-executive':
    case 'corporate-professional':
    case 'ats-executive':
      return JORDAN_REED_PROFILE;
    case 'modern-minimal':
    case 'contemporary':
      return MAYA_LIN_PROFILE;
    case 'graduate-compact':
    case 'entry-level-professional':
    case 'one-page-compact':
    case 'ats-one-column':
      return DANIEL_KIM_PROFILE;
    case 'modern-developer':
    case 'engineering-minimal':
      return LUCAS_BENNETT_PROFILE;
    case 'modern-two-column':
    case 'software-engineer':
    case 'tech-professional':
    case 'clean-modern':
    case 'professional-modern':
    case 'ats-classic':
    case 'ats-professional':
    default:
      return ALEX_MORGAN_PROFILE;
  }
};
