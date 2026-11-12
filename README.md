# Intelligent Scholarship Allocation System (ScholarAlloc)

**Course:** Data Structure & Algorithm - II (CCSE0301) · **Programme:** B.Tech CSE · **SDG:** SDG-4, Quality Education
**Author:** Nandani Jaiswal (Roll No. 2501330100237) · **Faculty:** Mr. Pankaj Rajput

**Live demo:** https://scholar-spark-allocator.lovable.app

## The problem
Scholarships have limited seats and a fixed fund, and one student can qualify for several schemes while another qualifies for only one. This project decides who gets which award so that:

- each student receives at most one scholarship,
- no scholarship exceeds its seats,
- total spending stays within the budget,
- the total priority score of awarded students is as high as possible.

## How the data structures are used
| Concept | Unit | Role in the project |
|---|---|---|
| Arrays / structures | Core | Applicant records: ID, name, marks, income, category, gender |
| Sorting (merge, quick, heap) | Core | Rank applicants by marks, income or priority score |
| Searching (trie, hash map) | Core | Search a student by name while typing, or by ID |
| Tree | Unit 1 | Eligibility hierarchy: Scholarships → Merit / Need / Category → scholarship → criteria; pre-, in- and post-order traversal |
| Graph (adjacency list) | Unit 2 | Student and scholarship nodes, an edge when the student is eligible; BFS, DFS and connected components |
| Priority queue (max-heap) | Heap | Greedy allocation in priority order |
| Dynamic programming | Unit 3 | Knapsack over the budget: fund = capacity, award = weight, priority = value |
| Backtracking | Unit 4 | Tries every assignment and undoes it when seats or funds run out |
| Branch and bound | Unit 4 | Backtracking with an upper bound that prunes branches, started from the greedy result |

The scholarship rules set the priority score. The heap only keeps the order; it does not decide what is fair.

## Features
- Dashboard with competition per scholarship (eligible applicants against seats)
- Student and scholarship management (add, edit, delete)
- Eligibility tree explorer with step-by-step traversal and a pass/fail reason for each criterion
- Graph explorer with BFS, DFS, connected components and an adjacency list view
- Allocation engine with an adjustable budget, adjustable weights (merit, need, category bonus) and a choice of four methods
- Compare page: all four methods on identical data (total priority, seats, funds used, utilisation, nodes explored, nodes pruned, time)
- What-if simulator and reports
- An unallocated list that gives a reason for every student who received no award

## Architecture
```
React interface  →  Spring Boot REST APIs  →  Java DSA logic  →  MySQL (or H2)
```
The live demo runs in an in-browser **mock mode** that applies the same rules, so it works without the server.

## Repository structure
```
src/, public/, package.json   React web interface (generated with Lovable, TanStack Start)
backend/                      Spring Boot project (Java) with the Allocator class (to be added)
README.md
```

## Run locally
**Frontend** (requires Node.js or Bun)
```bash
bun install
bun run dev
```
`npm install` and `npm run dev` can be used instead. The interface starts in its in-browser mock mode, so no server is needed to try it.

**Backend** (to be added in `backend/`; requires JDK 17 or later and Maven)
```bash
cd backend
mvn spring-boot:run
```
The backend listens on `http://localhost:8080` by default. Use the H2 option for a quick start without a database server, or configure MySQL in `application.properties`.

## Known limits
- The data is sample data, not real applicant records.
- Plain backtracking grows exponentially, so it stops at a node and time limit and shows a "stopped early" note.
- Dynamic programming handles the budget and one-award-per-student exactly; seat limits are enforced in a repair step afterwards.

## Future work
Seat-aware dynamic programming or a flow-based method, real data with privacy controls, record upload and export, waiting lists, fairness checks across categories, authentication, and PDF export of results.

## References
1. T. H. Cormen, C. E. Leiserson, R. L. Rivest and C. Stein, *Introduction to Algorithms*, 4th ed. MIT Press, 2022.
2. R. Sedgewick and K. Wayne, *Algorithms*, 4th ed. Addison-Wesley, 2011.
3. E. Horowitz, S. Sahni and S. Rajasekaran, *Fundamentals of Computer Algorithms*, 2nd ed. Universities Press, 2008.
4. H. Kellerer, U. Pferschy and D. Pisinger, *Knapsack Problems*. Springer, 2004.
5. M. A. Weiss, *Data Structures and Algorithm Analysis in Java*, 3rd ed. Pearson, 2012.
6. United Nations General Assembly, "Transforming our world: the 2030 Agenda for Sustainable Development," A/RES/70/1, 2015.
