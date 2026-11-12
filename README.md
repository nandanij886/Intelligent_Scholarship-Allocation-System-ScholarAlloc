# Scholar Spark Allocator

Build a polished, responsive web app called "ScholarAlloc: Intelligent Scholarship Allocation System" (SDG-4 Quality Education). It is a DSA-driven tool that allocates limited scholarships when students are eligible for several. Stack: React + TypeScript + Tailwind + shadcn/ui, React Router, TanStack Query, Recharts, and React Flow (or D3) for graph and tree visuals. Do NOT use Supabase or any backend. All data comes from a REST API at a configurable base URL (default http://localhost:8080/api), editable in Settings and saved in localStorage. Add a "Mock mode" toggle (ON by default) that runs the same features from realistic in-browser seed data, so the app fully works without the backend. Look: clean academic-tech style, indigo/teal accents, light and dark mode, sidebar navigation, mobile friendly.

SEED DATA (mock mode): 30 Indian students (id, name, marks %, annual family income in INR, category General/OBC/SC/ST/EWS, gender, branch) and 8 scholarships (e.g. Merit Excellence, Need-Based Aid, SC/ST Support, EWS Grant, Women in Tech, Rural Student Fund, Sports Merit, Research Fellowship), each with minMarks, maxIncome, allowed categories, seats, amount per award (INR), and total fund. Make some students eligible for 3-4 scholarships and some for only one, so conflicts are visible.

PAGES
1. Dashboard: cards (total students, scholarships, total fund, seats, eligible pairs, last allocation utilisation), bar chart of competition per scholarship, pie chart of fund by category, recent allocation runs.
2. Students: table with add, edit, delete, CSV import/export. Search box with autocomplete (Trie-based prefix search) and exact lookup by ID (hash map). Sort by marks, income or priority score using a selectable algorithm (Merge Sort, Quick Sort, Heap Sort). Show the algorithm used, comparisons count and time taken in a small badge. Add a binary-search-by-ID demo that shows the steps.
3. Scholarships: table and form with criteria, seats, amount, fund, plus a priority-weight editor.
4. Eligibility Tree (Unit 1): interactive tree Scholarships -> Merit / Need / Category -> specific criteria. Choose a student and animate the traversal (preorder, inorder or postorder toggle), highlighting passed and failed criteria, with a final eligible/not eligible verdict and reasons.
5. Graph Explorer (Units 2): bipartite graph with students on the left, scholarships on the right, and eligibility edges. Adjacency-list panel and a toggle to show the adjacency matrix with a sparsity percentage. Show out-degree of each student and in-degree of each scholarship. Buttons: run BFS, run DFS from a chosen node (step-by-step animation with visit order and a queue/stack view), and highlight Connected Components in different colours. Click a scholarship to list all competing students.
6. Allocation Engine: set total budget (default sum of funds), priority weights (sliders: merit, need, category bonus, default 0.5 / 0.4 / 0.1, normalised to 100%), and choose an algorithm:
   a) Priority Queue (greedy max-heap)
   b) Dynamic Programming (0/1 knapsack: budget = capacity, award = weight, priority score = value)
   c) Backtracking (try assignments, undo when seats/funds run out)
   d) Branch and Bound (prune branches whose upper bound cannot beat the best so far)
   Run shows: allocation table (student -> scholarship, amount, score), unallocated students with the reason, funds used, seats filled, and metrics: total priority, utilisation %, nodes explored, nodes pruned, time in ms. Include a step-by-step playback: heap pops for Priority Queue, the DP table filling for knapsack, and the state-space tree with pruned branches in red for Backtracking and Branch and Bound.
7. Compare: run all four algorithms on the same data and show a side-by-side table and bar charts (total priority, utilisation, time, nodes explored). Highlight the best algorithm and show a plain-language note about where greedy loses to DP. Include a fairness panel: allocation share by category and gender versus applicant share.
8. What-If Simulator: change the budget, seats or weights and see the allocation delta (who gains or loses) against the last run.
9. Reports: allocation history list, view any run, export CSV and print-friendly PDF (via window.print stylesheet), and an audit log (who ran what, when, parameters).
10. Algorithms and Complexity: a reference page for every structure used (Array, Tree, Graph, Heap, Trie, HashMap, Sorting, Binary Search, BFS/DFS, DP, Backtracking, Branch and Bound) with where it is used in the app, time/space complexity, and why it was chosen over alternatives.
11. Settings: API base URL, mock mode toggle, theme, reset seed data, "Test connection" button that calls GET /health.

API CONTRACT (call these when Mock mode is OFF; JSON; use camelCase)
GET /health
GET/POST /students; GET/PUT/DELETE /students/{id}; POST /students/import
GET /students/search?prefix=; GET /students/lookup/{id}
GET /students/sorted?by=marks|income|priority&algo=merge|quick|heap  -> {items, comparisons, timeMs}
GET/POST /scholarships; PUT/DELETE /scholarships/{id}
GET /tree  -> nested {name, children[]}
GET /tree/check/{studentId}?order=pre|in|post -> {steps[{node,passed,reason}], eligibleFor[]}
GET /graph -> {students[], scholarships[], edges[{studentId,scholarshipId}], outDegree{}, inDegree{}}
GET /graph/bfs?start=  and  /graph/dfs?start=  -> {order[], steps[]}
GET /graph/components -> {components[[nodeIds]]}
POST /allocate {algorithm: "PQ"|"DP"|"BACKTRACK"|"BNB", budget, weights{merit,need,category}} -> {runId, allocations[{studentId,scholarshipId,amount,score}], unallocated[{studentId,reason}], totalPriority, fundsUsed, seatsFilled, utilisation, nodesExplored, nodesPruned, timeMs, steps[]}
POST /allocate/compare {budget, weights} -> array of the above, one per algorithm
GET /allocations ; GET /allocations/{runId}
POST /seed -> resets sample data
Show friendly loading, empty and error states. If an API call fails, show a toast and offer to switch to Mock mode.

QUALITY: keep code modular (one api client file, one mock-engine file implementing the four algorithms in TypeScript for mock mode), type every response, and add the top-left logo text "ScholarAlloc". Do not add authentication.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scholar-spark-allocator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4c72b44-44ef-4f96-a7af-975d5c097ce8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
