import { ReadingMaterial, StudyTip } from '../types';
import { generateSampleVoiceNoteWav } from './audioUtils';

export const INITIAL_STUDY_TIPS: StudyTip[] = [
  {
    id: 'tip_1',
    title: 'The Feynman Technique for Deep Understanding',
    authorName: 'Alex K. (CS Junior)',
    category: 'active_recall',
    content: 'Whenever you finish reading a difficult chapter, close your notes and explain the core mechanism out loud as if teaching a 10-year-old. If you hit a blank spot or catch yourself using dense jargon without clarity, reopen that exact page and refine your notes.',
    tags: ['Active Recall', 'Mental Models', 'No Jargon'],
    likes: 42,
    userLiked: true,
    createdAt: '2026-09-10',
    voiceMessage: {
      id: 'vm_tip_1',
      audioUrl: generateSampleVoiceNoteWav(6),
      durationSeconds: 6,
      recordedAt: '2026-09-10T14:20:00Z',
      fileSizeFormatted: '258 KB',
    },
  },
  {
    id: 'tip_2',
    title: 'The 50/10 Focus Sprint with Audio Cues',
    authorName: 'Fatima Z. (Pre-Med)',
    category: 'time_management',
    content: 'Standard 25/5 pomodoros were too short for complex medical readings. Switch to 50 minutes of deep reading with phone on Do Not Disturb in another room, followed by 10 minutes of physical stretching and water. 3 rounds equals 2.5 hours of solid mastery.',
    tags: ['Pomodoro', 'Deep Work', 'Endurance'],
    likes: 38,
    userLiked: false,
    createdAt: '2026-09-11',
  },
  {
    id: 'tip_3',
    title: 'The "Blurting" Method for Exam Cramming',
    authorName: 'Marcus T. (Biochemistry)',
    category: 'exam_prep',
    content: 'Read 2 pages of diagrams or key pathways. Put the book face-down. Take a blank sheet of paper and scribble down everything you recall from memory without looking. Then compare in red ink what you missed. Repeat once more before bed for 90%+ retention.',
    tags: ['Blurting', 'Exam Prep', 'Memory'],
    likes: 56,
    userLiked: true,
    createdAt: '2026-09-12',
    voiceMessage: {
      id: 'vm_tip_3',
      audioUrl: generateSampleVoiceNoteWav(5),
      durationSeconds: 5,
      recordedAt: '2026-09-12T19:30:00Z',
      fileSizeFormatted: '215 KB',
    },
  },
  {
    id: 'tip_4',
    title: 'Cornell Annotations on PDF Slides',
    authorName: 'Sarah L. (Economics)',
    category: 'note_taking',
    content: 'When storing lecture slides or PDF papers here in FacheeBook, use the 3-column habit: Column 1 = Key Concept Keywords, Column 2 = Detailed notes/formulas, Bottom = 2-sentence summary. When reviewing for midterms, cover column 2 and quiz yourself using only column 1.',
    tags: ['PDFs', 'Cornell Notes', 'Slides'],
    likes: 29,
    userLiked: false,
    createdAt: '2026-09-13',
  },
  {
    id: 'tip_5',
    title: 'The 24-Hour Review Rule for Retention',
    authorName: 'Prof. David Chen (Guest Mentor)',
    category: 'wellness',
    content: 'The Ebbinghaus forgetting curve proves you lose 70% of new reading within 24 hours if unreviewed. Take just 5 minutes within 24 hours of first reading to scan your saved Key Takeaways in FacheeBook. That 5-minute review extends retention for 3 weeks.',
    tags: ['Spaced Repetition', 'Brain Science'],
    likes: 64,
    userLiked: true,
    createdAt: '2026-09-14',
  },
];

const nowMs = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

export const INITIAL_READING_MATERIALS: ReadingMaterial[] = [
  {
    id: 'mat_1',
    title: 'Introduction to Algorithms: Graph Traversal & Dijkstra',
    subject: 'Computer Science',
    author: 'Thomas H. Cormen, Charles E. Leiserson',
    professor: 'Dr. Katherine Rivera',
    semester: 'Fall 2026',
    description: 'Comprehensive study of Breadth-First Search (BFS), Depth-First Search (DFS), and Dijkstra Shortest Path algorithm with priority queue implementations.',
    status: 'reading',
    priority: 'high',
    rating: 5,
    totalPages: 48,
    pagesRead: 32,
    tags: ['Algorithms', 'Graphs', 'Big-O', 'Data Structures'],
    keyTakeaways: [
      'BFS uses a FIFO Queue and finds the shortest path on unweighted graphs in O(V + E) time.',
      'Dijkstra operates greedily using a Min-Heap priority queue; does not support negative edge weights.',
      'DFS uses a LIFO Stack or recursion, useful for topological sorting and cycle detection.',
      'Time complexity of Dijkstra with binary heap is O((V + E) log V).',
    ],
    notesMarkdown: `# Graph Algorithms Study Guide\n- **Dijkstra Invariant**: When node u is extracted from the priority queue, dist[u] is guaranteed minimal.\n- **Exam Watchout**: If negative edge weights exist, use Bellman-Ford O(V * E) instead of Dijkstra!\n- Check practice problem sets 3 & 4.`,
    photos: [
      {
        id: 'p1',
        name: 'Dijkstra_Graph_Stepwise_Diagram.png',
        type: 'photo',
        format: 'png',
        sizeBytes: 184500,
        dataUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
        createdAt: new Date(nowMs - 2 * dayMs).toISOString(),
      },
      {
        id: 'p2',
        name: 'Whiteboard_DFS_Tree_Colors.jpg',
        type: 'photo',
        format: 'jpg',
        sizeBytes: 245000,
        dataUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
        createdAt: new Date(nowMs - 1 * dayMs).toISOString(),
      }
    ],
    videoLinks: [
      {
        id: 'vl1',
        title: 'MIT OpenCourseWare: Dijkstra Algorithm & Priority Queues',
        url: 'https://www.youtube.com/watch?v=2E7MmKv0Y24',
        platform: 'youtube',
        notes: 'Pay special attention to minute 18:20 on relaxation steps.',
      }
    ],
    shortVideos: [
      {
        id: 'sv1',
        name: 'Quick_30s_Heap_Relaxation_Demo.mp4',
        type: 'short_video',
        format: 'mp4',
        sizeBytes: 1250000,
        dataUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        createdAt: new Date(nowMs - 1 * dayMs).toISOString(),
      }
    ],
    documents: [
      {
        id: 'doc1',
        name: 'CS301_Graph_Algorithms_CheatSheet.pdf',
        type: 'document',
        format: 'pdf',
        sizeBytes: 412000,
        textContent: `CS301 ALGORITHMS CHEAT SHEET\n============================\n1. Graph Representation: Adjacency Matrix O(V^2) vs Adjacency List O(V + E)\n2. BFS Queue Invariant: Vertices sorted by distance d.\n3. Dijkstra Relax(u, v, w): if dist[v] > dist[u] + w(u,v) then dist[v] = dist[u] + w(u,v)\n4. Topological Sort: Runs DFS and inserts finished vertices onto front of linked list.`,
        createdAt: new Date(nowMs - 3 * dayMs).toISOString(),
      },
      {
        id: 'doc2',
        name: 'Dijkstra_Implementation_Snippet.py',
        type: 'document',
        format: 'py',
        sizeBytes: 1820,
        textContent: `import heapq\n\ndef dijkstra(graph, start):\n    distances = {node: float('inf') for node in graph}\n    distances[start] = 0\n    pq = [(0, start)]\n    \n    while pq:\n        cur_dist, u = heapq.heappop(pq)\n        if cur_dist > distances[u]:\n            continue\n        for v, weight in graph[u].items():\n            if distances[u] + weight < distances[v]:\n                distances[v] = distances[u] + weight\n                heapq.heappush(pq, (distances[v], v))\n    return distances`,
        createdAt: new Date(nowMs - 1 * dayMs).toISOString(),
      }
    ],
    createdAt: new Date(nowMs - 4 * dayMs).toISOString(),
    updatedAt: new Date(nowMs - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago (Active)
  },
  {
    id: 'mat_2',
    title: 'Cellular Respiration & ATP Synthase Mechanics',
    subject: 'Biology & Biochemistry',
    author: 'Bruce Alberts, Alexander Johnson',
    professor: 'Prof. Marcus Vance',
    semester: 'Fall 2026',
    description: 'Deep dive into Glycolysis, the Citric Acid Cycle (Krebs), and the Electron Transport Chain with Chemiosmotic ATP synthesis in the mitochondrial membrane.',
    status: 'completed',
    priority: 'high',
    rating: 5,
    totalPages: 36,
    pagesRead: 36,
    tags: ['Biochemistry', 'Mitochondria', 'Metabolism', 'ATP'],
    keyTakeaways: [
      'Glycolysis occurs in the cytosol, yielding net 2 ATP, 2 NADH, and 2 Pyruvate per glucose.',
      'Pyruvate dehydrogenase complex converts pyruvate into Acetyl-CoA in the mitochondrial matrix.',
      'Complexes I, III, and IV pump protons into the intermembrane space, creating the proton motive force.',
      'ATP Synthase F0 rotor spins as H+ ions pass through, driving conformational changes in the F1 catalytic head.',
    ],
    notesMarkdown: `# Biochemistry Review Notes\n- Yield per 1 glucose: ~30 to 32 ATP depending on the NADH shuttle (Malate-Aspartate vs Glycerol-3-Phosphate).\n- Oxygen is the terminal electron acceptor in complex IV, forming H2O.`,
    photos: [
      {
        id: 'p3',
        name: 'Mitochondrial_Cristae_Diagram.jpg',
        type: 'photo',
        format: 'jpg',
        sizeBytes: 310000,
        dataUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=60',
        createdAt: new Date(nowMs - 7 * dayMs).toISOString(),
      }
    ],
    videoLinks: [
      {
        id: 'vl2',
        title: 'ATP Synthase Molecular Machine 3D Animation',
        url: 'https://www.youtube.com/watch?v=kXpzp4RDGJI',
        platform: 'youtube',
        notes: 'Notice the gamma stalk rotation driving ADP + Pi condensation.',
      }
    ],
    shortVideos: [],
    documents: [
      {
        id: 'doc3',
        name: 'Biochem_Metabolic_Pathways_Table.txt',
        type: 'document',
        format: 'txt',
        sizeBytes: 3450,
        textContent: `METABOLIC PATHWAY SUMMARY\n=========================\nPathway: Glycolysis | Location: Cytoplasm | Rate-Limiting Enzyme: PFK-1\nPathway: Krebs Cycle | Location: Matrix | Rate-Limiting Enzyme: Isocitrate Dehydrogenase\nPathway: Gluconeogenesis | Location: Liver Cytoplasm/Mito | Rate-Limiting Enzyme: Fructose-1,6-bisphosphatase`,
        createdAt: new Date(nowMs - 6 * dayMs).toISOString(),
      }
    ],
    createdAt: new Date(nowMs - 8 * dayMs).toISOString(),
    updatedAt: new Date(nowMs - 2 * dayMs).toISOString(),
  },
  {
    id: 'mat_3',
    title: 'Macroeconomics: Monetary Policy & Inflation Targeting',
    subject: 'Economics',
    author: 'N. Gregory Mankiw',
    professor: 'Prof. Helen Thorne',
    semester: 'Fall 2026',
    description: 'Analysis of central bank interest rate decisions, quantitative easing, Phillips Curve tradeoffs, and inflation dynamics in modern open economies.',
    status: 'to_read',
    priority: 'high',
    rating: 4,
    totalPages: 28,
    pagesRead: 4,
    tags: ['Economics', 'Federal Reserve', 'Inflation', 'Policy'],
    keyTakeaways: [
      'Taylor Rule models how central banks should adjust nominal interest rates in response to inflation and output gaps.',
      'Short-run Phillips curve illustrates an inverse relationship between unemployment and inflation.',
      'In the long run, the Phillips curve is vertical at the Natural Rate of Unemployment (NAIRU).',
      'Open market operations directly impact bank reserve balances and the federal funds rate.',
    ],
    notesMarkdown: `# Macro Midterm Concepts\n- Real Interest Rate = Nominal Interest Rate - Inflation (Fisher Equation).\n- Cost-push vs Demand-pull inflation drivers.`,
    photos: [],
    videoLinks: [
      {
        id: 'vl3',
        title: 'Khan Academy: The Federal Reserve and Financial System',
        url: 'https://www.youtube.com/watch?v=1dq7mMort9o',
        platform: 'youtube',
      }
    ],
    shortVideos: [],
    documents: [
      {
        id: 'doc4',
        name: 'Econ202_Monetary_Transmission_Mechanism.docx',
        type: 'document',
        format: 'docx',
        sizeBytes: 85200,
        textContent: `ECON 202 LECTURE NOTES: Monetary Transmission Channels\n1. Interest Rate Channel: Lower rates -> lower borrowing cost -> higher investment.\n2. Asset Price Channel: Equity and real estate price stimulation.\n3. Exchange Rate Channel: Currency depreciation -> higher net exports.`,
        createdAt: new Date(nowMs - 8 * dayMs).toISOString(),
      }
    ],
    createdAt: new Date(nowMs - 8 * dayMs).toISOString(),
    updatedAt: new Date(nowMs - 7 * dayMs).toISOString(), // 7 days of inactivity! Needs review reminder
  },
  {
    id: 'mat_4',
    title: 'Organic Chemistry: SN1 & SN2 Reaction Mechanisms',
    subject: 'Chemistry',
    author: 'David R. Klein',
    professor: 'Dr. Aris Thorne',
    semester: 'Fall 2026',
    description: 'Comprehensive mechanism notes on nucleophilic substitution (SN1 vs SN2), solvent effects (polar protic vs polar aprotic), carbocation stability, and stereochemical inversion (Walden inversion).',
    status: 'under_review',
    priority: 'high',
    rating: 5,
    totalPages: 34,
    pagesRead: 26,
    tags: ['Organic Chemistry', 'Reaction Mechanisms', 'Stereochemistry', 'Kinetics'],
    keyTakeaways: [
      'SN2 occurs via concerted backside attack resulting in 100% inversion of stereochemistry; favored in polar aprotic solvents (DMSO, DMF, Acetone).',
      'SN1 proceeds through carbocation intermediate resulting in racemization; favored in polar protic solvents (H2O, EtOH).',
      'Substrate rate hierarchy: SN2 is Methyl > 1° > 2° >> 3° (steric hindrance); SN1 is 3° > 2° >> 1° (carbocation stabilization).',
      'Tertiary substrates never undergo SN2 due to severe steric clash.',
    ],
    notesMarkdown: `# Organic Chemistry Review Sheet\n- Watch for hydride and methyl shifts during SN1 carbocation intermediates.\n- Polar aprotic solvents accelerate SN2 by leaving nucleophiles unencumbered.\n- Prepare for Friday quiz!`,
    photos: [
      {
        id: 'p4',
        name: 'SN1_Carbocation_Energy_Profile.png',
        type: 'photo',
        format: 'png',
        sizeBytes: 198000,
        dataUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=60',
        createdAt: new Date(nowMs - 12 * dayMs).toISOString(),
      }
    ],
    videoLinks: [
      {
        id: 'vl4',
        title: 'Khan Academy: SN1 vs SN2 Substitution Reactions',
        url: 'https://www.youtube.com/watch?v=hVmaXkF4_9w',
        platform: 'youtube',
        notes: 'Crucial summary table at minute 14.',
      }
    ],
    shortVideos: [],
    documents: [
      {
        id: 'doc5',
        name: 'CHEM220_Substitution_Elimination_Decision_Tree.pdf',
        type: 'document',
        format: 'pdf',
        sizeBytes: 312000,
        textContent: `CHEM 220 DECISION MATRIX:\n1. Check base/nucleophile strength (Strong vs Weak)\n2. Check substrate bulkiness (1°, 2°, 3°)\n3. Check temperature: High heat favors elimination (E1/E2), lower heat favors substitution (SN1/SN2).`,
        createdAt: new Date(nowMs - 11 * dayMs).toISOString(),
      }
    ],
    createdAt: new Date(nowMs - 12 * dayMs).toISOString(),
    updatedAt: new Date(nowMs - 10 * dayMs).toISOString(), // 10 days of inactivity! Under review needing attention
  },
  {
    id: 'mat_5',
    title: 'Linear Algebra: Eigenvalues, Eigenvectors & Diagonalization',
    subject: 'Mathematics',
    author: 'Gilbert Strang',
    professor: 'Prof. Sarah Jenkins',
    semester: 'Fall 2026',
    description: 'Lecture materials and problem sets covering characteristic polynomials det(A - lambda*I) = 0, eigenspaces, geometric vs algebraic multiplicity, and matrix diagonalization A = S * Lambda * S^-1.',
    status: 'to_read',
    priority: 'medium',
    rating: 4,
    totalPages: 22,
    pagesRead: 0,
    tags: ['Linear Algebra', 'Eigenvalues', 'Diagonalization', 'Matrices'],
    keyTakeaways: [
      'Eigenvector is a non-zero vector x such that A * x = lambda * x.',
      'Eigenvalues are roots of characteristic polynomial det(A - lambda * I) = 0.',
      'A matrix of size n x n is diagonalizable if and only if it has n linearly independent eigenvectors.',
      'Symmetric matrices have real eigenvalues and orthogonal eigenvectors (Spectral Theorem).',
    ],
    notesMarkdown: `# Linear Algebra Chapter 6\n- Review nullspace computation for (A - lambda*I) to find eigenspace basis.\n- Diagonalization powers: A^k = S * Lambda^k * S^-1.`,
    photos: [],
    videoLinks: [
      {
        id: 'vl5',
        title: '3Blue1Brown: Essence of Linear Algebra - Eigenvectors and Eigenvalues',
        url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        platform: 'youtube',
      }
    ],
    shortVideos: [],
    documents: [
      {
        id: 'doc6',
        name: 'MATH204_Eigenvalues_Summary.pdf',
        type: 'document',
        format: 'pdf',
        sizeBytes: 145000,
        textContent: `EIGENVALUE METHODS\n1. Solve det(A - lambda I) = 0\n2. For each lambda, solve (A - lambda I)v = 0\n3. Verify algebraic multiplicity equals geometric multiplicity for full diagonalizability.`,
        createdAt: new Date(nowMs - 6 * dayMs).toISOString(),
      }
    ],
    createdAt: new Date(nowMs - 6 * dayMs).toISOString(),
    updatedAt: new Date(nowMs - 5 * dayMs).toISOString(), // 5 days of inactivity (To Read)
  }
];
