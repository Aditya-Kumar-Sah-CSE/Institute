// BCE/scripts/tcs-sheet/group13_graphs.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 196,
    external_problem_id: 'tcs-196',
    title: '196. Represent a graph using adjacency list and matrix',
    slug: 'tcs-196-graph-representation-adj-list-matrix',
    difficulty: 'EASY',
    tags: ['Graph', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains V and E (number of vertices 0 to V-1 and edges). Next E lines each contain two integers U and V (undirected edge).',
    output_format: 'Print "Adjacency Matrix:" followed by V lines of V space-separated integers (0 or 1). Then print "Adjacency List:" followed by V lines: "i: v1 v2 ..." with neighbors sorted in ascending order.',
    constraints: '1 <= V <= 50, 0 <= E <= V*(V-1)/2',
    description: formatDescription(
      'Graph Representation (Matrix & List)',
      'Given an undirected unweighted graph with V vertices (numbered 0 to V-1) and E edges, output both its Adjacency Matrix and Adjacency List (with neighbors sorted).',
      'V E\nE pairs of u v',
      'Adjacency Matrix followed by Adjacency List.',
      '1 <= V <= 50',
      [
        {
          input: '3 2\n0 1\n1 2',
          output: 'Adjacency Matrix:\n0 1 0\n1 0 1\n0 1 0\nAdjacency List:\n0: 1\n1: 0 2\n2: 1',
          explanation: 'Vertex 1 connects to 0 and 2.'
        },
        {
          input: '2 1\n0 1',
          output: 'Adjacency Matrix:\n0 1\n1 0\nAdjacency List:\n0: 1\n1: 0'
        }
      ]
    ),
    starter_code: makeStarterCode('Build V x V 2D array and array of lists for 0-indexed undirected graph'),
    testCases: [
      { input: '3 2\n0 1\n1 2', expected_output: 'Adjacency Matrix:\n0 1 0\n1 0 1\n0 1 0\nAdjacency List:\n0: 1\n1: 0 2\n2: 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 1\n0 1', expected_output: 'Adjacency Matrix:\n0 1\n1 0\nAdjacency List:\n0: 1\n1: 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0\n', expected_output: 'Adjacency Matrix:\n0\nAdjacency List:\n0:', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 3\n0 1\n0 2\n0 3', expected_output: 'Adjacency Matrix:\n0 1 1 1\n1 0 0 0\n1 0 0 0\n1 0 0 0\nAdjacency List:\n0: 1 2 3\n1: 0\n2: 0\n3: 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n0 1\n1 2\n0 2', expected_output: 'Adjacency Matrix:\n0 1 1\n1 0 1\n1 1 0\nAdjacency List:\n0: 1 2\n1: 0 2\n2: 0 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 197,
    external_problem_id: 'tcs-197',
    title: '197. Implement BFS traversal',
    slug: 'tcs-197-bfs-traversal-graph',
    difficulty: 'EASY',
    tags: ['Graph', 'BFS', 'Queue', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain undirected edges u v. Last line contains starting vertex S.',
    output_format: 'Print the BFS traversal starting from S, visiting adjacent vertices in ascending order, space-separated.',
    constraints: '1 <= V <= 10^4, 0 <= E <= 10^5',
    description: formatDescription(
      'Breadth First Search (BFS)',
      'Given an undirected graph with V vertices (0 to V-1) and E edges, perform a Breadth First Search starting from vertex S. When multiple adjacent vertices are reachable, visit the one with smaller numerical label first.',
      'V E\nE edges\nS',
      'BFS traversal order space-separated',
      '1 <= V <= 10^4',
      [
        { input: '5 4\n0 1\n0 2\n0 3\n2 4\n0', output: '0 1 2 3 4', explanation: 'BFS from 0 visits 1, 2, 3 then 4.' },
        { input: '4 3\n0 1\n1 2\n2 3\n0', output: '0 1 2 3' }
      ]
    ),
    starter_code: makeStarterCode('Queue-based BFS with visited boolean array, sorting neighbors in ascending order'),
    testCases: [
      { input: '5 4\n0 1\n0 2\n0 3\n2 4\n0', expected_output: '0 1 2 3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 3\n0 1\n1 2\n2 3\n0', expected_output: '0 1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 4\n0 1\n0 2\n1 3\n2 3\n0', expected_output: '0 1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 5\n0 1\n0 2\n1 3\n1 4\n2 5\n0', expected_output: '0 1 2 3 4 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 198,
    external_problem_id: 'tcs-198',
    title: '198. Implement DFS traversal',
    slug: 'tcs-198-dfs-traversal-graph',
    difficulty: 'EASY',
    tags: ['Graph', 'DFS', 'Recursion', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain undirected edges u v. Last line contains starting vertex S.',
    output_format: 'Print the DFS traversal starting from S, visiting adjacent vertices in ascending order, space-separated.',
    constraints: '1 <= V <= 10^4, 0 <= E <= 10^5',
    description: formatDescription(
      'Depth First Search (DFS)',
      'Given an undirected graph with V vertices and E edges, perform a Depth First Search starting from vertex S. When multiple adjacent vertices exist, visit the smaller vertex first.',
      'V E\nE edges\nS',
      'DFS traversal order space-separated',
      '1 <= V <= 10^4',
      [
        { input: '5 4\n0 1\n0 2\n0 3\n2 4\n0', output: '0 1 2 4 3', explanation: 'From 0 go to 1, back to 0, go to 2, then 4, back to 0, go to 3.' },
        { input: '4 3\n0 1\n1 2\n2 3\n0', output: '0 1 2 3' }
      ]
    ),
    starter_code: makeStarterCode('Recursive DFS with visited array, sorting neighbor adjacency lists in ascending order'),
    testCases: [
      { input: '5 4\n0 1\n0 2\n0 3\n2 4\n0', expected_output: '0 1 2 4 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 3\n0 1\n1 2\n2 3\n0', expected_output: '0 1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 4\n0 1\n0 2\n1 3\n2 3\n0', expected_output: '0 1 3 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 3\n0 1\n0 2\n0 3\n0', expected_output: '0 1 2 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 199,
    external_problem_id: 'tcs-199',
    title: '199. Count connected components in an undirected graph',
    slug: 'tcs-199-connected-components-undirected-graph',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'BFS', 'DFS', 'Disjoint Set', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain undirected edges u v.',
    output_format: 'Print the total number of connected components in the graph.',
    constraints: '1 <= V <= 10^5, 0 <= E <= 2*10^5',
    description: formatDescription(
      'Number of Connected Components',
      'Given an undirected graph with V vertices (numbered 0 to V-1) and E edges, find the total number of connected components in the graph.',
      'V E\nE edges',
      'Number of connected components',
      '1 <= V <= 10^5',
      [
        { input: '5 3\n0 1\n1 2\n3 4', output: '2', explanation: 'Components are {0, 1, 2} and {3, 4}.' },
        { input: '5 0\n', output: '5', explanation: '5 isolated vertices.' }
      ]
    ),
    starter_code: makeStarterCode('Run BFS/DFS from each unvisited vertex or use Disjoint Set Union (DSU)'),
    testCases: [
      { input: '5 3\n0 1\n1 2\n3 4', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 0\n', expected_output: '5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 3\n0 1\n1 2\n2 3', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 0\n', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 4\n0 1\n1 2\n3 4\n4 5', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 200,
    external_problem_id: 'tcs-200',
    title: '200. Detect cycle in an undirected graph',
    slug: 'tcs-200-detect-cycle-undirected-graph',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'DFS', 'BFS', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain undirected edges u v.',
    output_format: 'Print "true" if the graph contains at least one cycle, otherwise "false".',
    constraints: '1 <= V <= 10^4, 0 <= E <= 2*10^4',
    description: formatDescription(
      'Detect Cycle in Undirected Graph',
      'Given an undirected graph with V vertices and E edges, determine whether the graph contains a cycle or not.',
      'V E\nE edges',
      'true or false',
      '1 <= V <= 10^4',
      [
        { input: '5 5\n0 1\n1 2\n2 3\n3 4\n4 1', output: 'true', explanation: 'Cycle: 1-2-3-4-1.' },
        { input: '4 3\n0 1\n1 2\n2 3', output: 'false', explanation: 'Tree structure with no cycle.' }
      ]
    ),
    starter_code: makeStarterCode('DFS tracking parent: if adjacent node is visited and not parent, cycle detected'),
    testCases: [
      { input: '5 5\n0 1\n1 2\n2 3\n3 4\n4 1', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 3\n0 1\n1 2\n2 3', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 3\n0 1\n1 2\n2 0', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 2\n0 1\n0 2', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 0\n', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 201,
    external_problem_id: 'tcs-201',
    title: '201. Detect cycle in a directed graph',
    slug: 'tcs-201-detect-cycle-directed-graph',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'DFS', 'Topological Sort', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain directed edges u v (u -> v).',
    output_format: 'Print "true" if the directed graph contains a cycle, otherwise "false".',
    constraints: '1 <= V <= 10^4, 0 <= E <= 2*10^4',
    description: formatDescription(
      'Detect Cycle in Directed Graph',
      'Given a directed graph with V vertices and E edges, determine whether the graph contains a directed cycle.',
      'V E\nE directed edges u v',
      'true or false',
      '1 <= V <= 10^4',
      [
        { input: '4 4\n0 1\n1 2\n2 3\n3 1', output: 'true', explanation: 'Cycle 1 -> 2 -> 3 -> 1.' },
        { input: '4 3\n0 1\n1 2\n2 3', output: 'false', explanation: 'A DAG with no cycles.' }
      ]
    ),
    starter_code: makeStarterCode('DFS with recursion stack tracking (inStack) or Kahn\'s algorithm indegree count'),
    testCases: [
      { input: '4 4\n0 1\n1 2\n2 3\n3 1', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 3\n0 1\n1 2\n2 3', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 2\n0 1\n1 0', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 2\n0 1\n0 2', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 0\n', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 202,
    external_problem_id: 'tcs-202',
    title: '202. Find shortest path in an unweighted graph',
    slug: 'tcs-202-shortest-path-unweighted-graph',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'BFS', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain undirected edges u v. Last line contains Src and Dest.',
    output_format: 'Print the length of the shortest path (number of edges) from Src to Dest. If Dest is unreachable, print -1.',
    constraints: '1 <= V <= 10^4, 0 <= E <= 5*10^4',
    description: formatDescription(
      'Shortest Path in Unweighted Graph',
      'Given an unweighted undirected graph, find the shortest distance (minimum number of edges) from a given source node to a target destination node using Breadth-First Search.',
      'V E\nE edges\nSrc Dest',
      'Shortest distance or -1',
      '1 <= V <= 10^4',
      [
        { input: '6 7\n0 1\n0 2\n1 2\n1 3\n2 4\n3 5\n4 5\n0 5', output: '3', explanation: 'Shortest path 0 -> 1 -> 3 -> 5 has 3 edges.' },
        { input: '4 1\n0 1\n0 3', output: '-1', explanation: '3 is unreachable from 0.' }
      ]
    ),
    starter_code: makeStarterCode('BFS maintaining dist[] array initialized to -1 with dist[src] = 0'),
    testCases: [
      { input: '6 7\n0 1\n0 2\n1 2\n1 3\n2 4\n3 5\n4 5\n0 5', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 1\n0 1\n0 3', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 2\n0 1\n1 2\n0 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 3\n0 1\n1 2\n0 2\n0 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 0\n0 0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 203,
    external_problem_id: 'tcs-203',
    title: '203. Implement Dijkstra\'s shortest path',
    slug: 'tcs-203-dijkstras-shortest-path',
    difficulty: 'HARD',
    tags: ['Graph', 'Dijkstra', 'Priority Queue', 'Greedy', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain u v w (undirected edge with non-negative weight w). Last line contains Src.',
    output_format: 'Print V space-separated integers representing shortest distances from Src to vertices 0 to V-1. If unreachable, print -1.',
    constraints: '1 <= V <= 10^4, 0 <= E <= 5*10^4, 0 <= w <= 10^5',
    description: formatDescription(
      'Dijkstra\'s Shortest Path Algorithm',
      'Given a weighted, undirected and connected/disconnected graph of V vertices and an adjacency list, find the shortest distance of all vertices from the source vertex Src using Dijkstra\'s algorithm with a min-priority queue.',
      'V E\nE lines of u v w\nSrc',
      'V shortest distances space-separated',
      '1 <= V <= 10^4',
      [
        { input: '4 4\n0 1 1\n0 2 4\n1 2 2\n2 3 1\n0', output: '0 1 3 4', explanation: 'Distances from 0: to 0 is 0, to 1 is 1, to 2 is 1+2=3, to 3 is 3+1=4.' },
        { input: '3 1\n0 1 5\n0', output: '0 5 -1', explanation: 'Node 2 is unreachable.' }
      ]
    ),
    starter_code: makeStarterCode('Min-priority queue Dijkstra algorithm storing (distance, node) pairs'),
    testCases: [
      { input: '4 4\n0 1 1\n0 2 4\n1 2 2\n2 3 1\n0', expected_output: '0 1 3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 1\n0 1 5\n0', expected_output: '0 5 -1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 1\n0 1 10\n1', expected_output: '10 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 6\n0 1 2\n0 2 4\n1 2 1\n1 3 7\n2 4 3\n3 4 1\n0', expected_output: '0 2 3 7 6', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 0\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 204,
    external_problem_id: 'tcs-204',
    title: '204. Topological sort using Kahn\'s algorithm',
    slug: 'tcs-204-topological-sort-kahns-algorithm',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'Topological Sort', 'BFS', 'TCS NQT'],
    input_format: 'First line contains V and E. Next E lines contain directed edges u v (u -> v).',
    output_format: 'Print the topological ordering of vertices space-separated (breaking ties by smaller vertex id). If a cycle exists, print "CYCLE".',
    constraints: '1 <= V <= 10^4, 0 <= E <= 5*10^4',
    description: formatDescription(
      'Topological Sort (Kahn\'s Algorithm)',
      'Given a Directed Acyclic Graph (DAG) with V vertices and E edges, compute its topological order using Kahn\'s in-degree based BFS algorithm. When multiple vertices have in-degree 0, process the smaller vertex first. If a cycle exists, print CYCLE.',
      'V E\nE directed edges u v',
      'Space-separated topological ordering or CYCLE',
      '1 <= V <= 10^4',
      [
        { input: '6 6\n5 0\n5 2\n2 3\n3 1\n4 0\n4 1', output: '4 5 0 2 3 1', explanation: 'Valid topological sort with tie breaking.' },
        { input: '2 2\n0 1\n1 0', output: 'CYCLE', explanation: 'Graph contains a cycle.' }
      ]
    ),
    starter_code: makeStarterCode('Calculate in-degrees, push 0 in-degree nodes into min-heap/priority queue'),
    testCases: [
      { input: '6 6\n5 0\n5 2\n2 3\n3 1\n4 0\n4 1', expected_output: '4 5 0 2 3 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 2\n0 1\n1 0', expected_output: 'CYCLE', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 2\n0 1\n1 2', expected_output: '0 1 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 3\n0 2\n1 2\n2 3', expected_output: '0 1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 0\n', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 205,
    external_problem_id: 'tcs-205',
    title: '205. Find number of islands in a grid',
    slug: 'tcs-205-number-of-islands-grid',
    difficulty: 'MEDIUM',
    tags: ['Graph', 'BFS', 'DFS', 'Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C (rows and columns). Next R lines each contain C space-separated integers (1 for land, 0 for water).',
    output_format: 'Print the total number of islands (connected components of 1s horizontally or vertically).',
    constraints: '1 <= R, C <= 300',
    description: formatDescription(
      'Number of Islands',
      'Given an R x C 2D grid which represents a map of 1s (land) and 0s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically (4-directional).',
      'R C\nR lines with C values',
      'Total island count',
      '1 <= R, C <= 300',
      [
        {
          input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0',
          output: '1',
          explanation: 'All 1s form a single connected island.'
        },
        {
          input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1',
          output: '3',
          explanation: '3 disconnected islands.'
        }
      ]
    ),
    starter_code: makeStarterCode('DFS or BFS flood fill to mark connected land cells as visited'),
    testCases: [
      { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', expected_output: '1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1\n1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 1\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n1 0 1\n0 1 0\n1 0 1', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

