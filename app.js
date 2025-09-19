// app.js - RailOptima Dashboard
const { useState, useEffect, useRef } = React;

/* ----- Mock Train Data ----- */

const initialTrains = [
  { id: '12456', type: 'Express', pos: 12, speed: 1.1, origin: 'Delhi', dest: 'Bangalore', priority: 3, delay: 0 },
  { id: '22559', type: 'Freight', pos: 34, speed: 0.6, origin: 'Chennai', dest: 'Pune', priority: 1, delay: 2 },
  { id: '33679', type: 'Passenger', pos: 57, speed: 0.9, origin: 'Kolkata', dest: 'Mumbai', priority: 2, delay: 6 },
  { id: '44780', type: 'Local', pos: 81, speed: 1.3, origin: 'Hyderabad', dest: 'Bhopal', priority: 2, delay: 0 },
];

/*
 // Generate 50 mock trains
function generateTrains(n) {
  const types = ["Express", "Passenger", "Freight", "Local"];
  const origins = ["Delhi", "Mumbai", "Chennai", "Kolkata", "Hyderabad", "Pune", "Bangalore", "Bhopal", "Lucknow"];
  const destinations = ["Delhi", "Mumbai", "Chennai", "Kolkata", "Hyderabad", "Pune", "Bangalore", "Bhopal", "Lucknow"];

  const trains = [];
  for (let i = 0; i < n; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    trains.push({
      id: (10000 + i).toString(),   // unique train ID
      type,
      pos: Math.floor(Math.random() * 100),   // 0–100 track %
      speed: +(0.5 + Math.random() * 1.5).toFixed(2), // 0.5–2.0 speed
      origin: origins[Math.floor(Math.random() * origins.length)],
      dest: destinations[Math.floor(Math.random() * destinations.length)],
      priority: type === "Express" ? 3 : type === "Passenger" ? 2 : 1,
      delay: Math.floor(Math.random() * 20) // 0–20 min delay
    });
  }
  return trains;
}

const initialTrains = generateTrains(50);

*/

/* ----- Helper Functions ----- */
function generateRecommendations(trains) {
  const recs = [];
  const horizon = 18; // look ahead
  const preds = trains.map(t => ({ ...t, pred: t.pos + t.speed * horizon }));
  for (let i = 0; i < preds.length; i++) {
    for (let j = i + 1; j < preds.length; j++) {
      const A = preds[i], B = preds[j];

      const overlap = !(Math.max(A.pos, A.pred) < Math.min(B.pos, B.pred) || 
                        Math.max(B.pos, B.pred) < Math.min(A.pos, A.pred));
      if (overlap) {
        let hold = A.priority < B.priority ? A : B;
        let pass = hold === A ? B : A;

        recs.push({
          id: `${pass.id}-${hold.id}`,
          reason: `Reschedule ${pass.id} ahead of ${hold.id} to avoid crossing.`,
          tradeoff: `Hold ${hold.id} for ~${Math.round(3 + Math.random()*2)} min, throughput +${10+Math.round(Math.random()*15)}%`,
          holdTrain: hold.id,
          passTrain: pass.id
        });
      }
    }
  }
  return recs.slice(0, 3); // limit for demo
}



function computeKPIs(trains) {

  const avgDelay = Math.round(trains.reduce((s,t)=>s+(t.delay||0),0)/trains.length);
  const avgSpeed = trains.reduce((s,t)=>s+t.speed,0)/trains.length;
  return {
    throughput: Math.min(100, Math.round(70 + avgSpeed*18)),
    avgDelay,
    inSection: trains.length
  };
}

/*
function computeKPI(trains, recommendations) {
    let totalTrains = trains.length;
    let totalConflicts = recommendations.length;

    // 1. Throughput KPI (trains that reach without delay)
    let trainsWithoutDelay = trains.filter(t => t.delay === 0).length;
    let throughput = (trainsWithoutDelay / totalTrains) * 100; // in %

    // 2. Average Delay
    let totalDelay = trains.reduce((sum, t) => sum + t.delay, 0);
    let avgDelay = totalDelay / totalTrains;

    // 3. Conflict Resolution Rate
    // assume each recommendation = 1 conflict resolved
    let conflictResolutionRate = totalConflicts > 0 ? (totalConflicts / totalTrains) * 100 : 0;

    return {
        throughput: throughput.toFixed(2) + "%",
        averageDelay: avgDelay.toFixed(2) + " units",
        conflictsResolved: conflictResolutionRate.toFixed(2) + "%"
    };
}

*/

/* ----- Components ----- */
function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    "Dashboard",
    "Real-time Schedule",
    "AI Scheduling",
    "Delay Analytics",
    "Reports",
    "About Us",
    "Admin Setting"
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="brand">
          <div className="logo">RO</div>
          <div>
            <h1>RailOptima</h1>
            <p>Real-time Control</p>
          </div>
        </div>

        <nav className="nav">
          {menuItems.map(item => (
            <a
              href="#"
              key={item}
              className={activePage === item ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setActivePage(item); }}
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}



function Topbar() {
  const now = new Date().toLocaleString();

  return (
    <header className="topbar">
      {/* Left: Date & Time */}
      <div className="topbar-left">{now}</div>

      {/* Right: Icons */}
      <div className="topbar-right">
        <span className="icon">🔔</span>

        {/* Calendar symbol with hidden input */}
        <label className="icon" style={{ cursor: "pointer", position: "relative" }}>
          📅
          <input
            type="date"
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%"
            }}
            onChange={(e) => alert("Selected date: " + e.target.value)}
          />
        </label>

        <span className="icon">👤</span>
      </div>
    </header>
  );
}







function TrainMap({ trains, onSelect }) {
  const width = 800, height = 220;

  // Color coding based on delay
  const getTrainColor = (delay) => {
    if (delay === 0) return "#22c55e";      // green = on time
    if (delay <= 5) return "#eab308";       // yellow = minor delay
    return "#ef4444";                       // red = major delay
  };

  return (
    <div className="track-svg card">
      <h3>Live Train Map</h3>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%">
        {/* Main horizontal tracks */}
        <line x1="80" y1="80" x2="720" y2="80" stroke="#2563eb" strokeWidth="4" />
        <line x1="80" y1="140" x2="720" y2="140" stroke="#2563eb" strokeWidth="4" />

        {/* Branching track example */}
        <line x1="200" y1="80" x2="300" y2="140" stroke="#2563eb" strokeWidth="4" />
        <line x1="500" y1="140" x2="600" y2="80" stroke="#2563eb" strokeWidth="4" />

        {/* Stations */}
        <text x="60" y="85" fontSize="12" fill="#333">SBC</text>
        <text x="700" y="145" fontSize="12" fill="#333">BLR</text>

        {/* Place trains on tracks */}
        {trains.map((t, idx) => {
          // pick a track (alternate between upper/lower for demo)
          const y = idx % 2 === 0 ? 80 : 140;
          const x = 100 + (t.pos * 6); // map pos% to SVG length
          const color = getTrainColor(t.delay);

          return (
            <g key={t.id} transform={`translate(${x},${y})`} onClick={() => onSelect(t)} style={{ cursor: "pointer" }}>


              <circle r="12" fill={color} stroke="#fff" strokeWidth="2" />

              <text x="0" y="4" fill="#fff" fontSize="9" textAnchor="middle">{t.id}</text>

            </g>
          );
        })}
      </svg>

      {/* Legend */}    
      <div className="legend">
        <div className="item"><span style={{width:12,height:12,background:"#22c55e",borderRadius:"50%",display:"inline-block"}}></span> On Time</div>
        <div className="item"><span style={{width:12,height:12,background:"#eab308",borderRadius:"50%",display:"inline-block"}}></span> Minor Delay</div>
        <div className="item"><span style={{width:12,height:12,background:"#ef4444",borderRadius:"50%",display:"inline-block"}}></span> Major Delay</div>
      </div>
    </div>
  );
}


function KPIBlock({kpis}) {
  return (
    <div className="kpi-row">
      <div className="kpi"><div className="label">Throughput</div><div className="num">{kpis.throughput}%</div></div>
      <div className="kpi"><div className="label">Avg Delay</div><div className="num">{kpis.avgDelay} min</div></div>
      <div className="kpi"><div className="label">Trains</div><div className="num">{kpis.inSection}</div></div>
    </div>
  );
}


function TrainTable({trains}) {
  return (
    <div className="card table">
      <h3>Train Schedule</h3>
      <table>
        <thead><tr><th>ID</th><th>Origin</th><th>Dest</th><th>Pos</th><th>Status</th></tr></thead>
        <tbody>
          {trains.map(t=>
            <tr key={t.id}>
              <td>{t.id}</td><td>{t.origin}</td><td>{t.dest}</td>
              <td>{t.pos.toFixed(0)}%</td>
              <td>{t.delay>0?`${t.delay} min delay`:"On Time"}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function Recommendations({recs, onApply, onModify, onOverride}) {
  return (
    <div className="card rec-card">
      <div className="rec-title"><div>Suggestions</div></div>
      {recs.length===0 && <div className="muted">No conflicts detected</div>}

      {recs.map(r=>
        <div key={r.id} className="rec-item">
          <div><b>{r.reason}</b></div>
          <div className="muted">{r.tradeoff}</div>

          <div className="rec-actions">
            <button className="btn btn-primary" onClick={()=>onApply(r)}>Apply</button>
            <button className="btn btn-ghost" onClick={()=>onModify(r)}>Modify</button>
          </div>
          <button className="btn btn-wide" onClick={()=>onOverride(r)}>Override AI</button>
        </div>
      )}
    </div>
  );
}

function Gantt({trains}) {
  return (
    <div className="card">
      <h3>Timeline</h3>
      {trains.map(t=>{
        const left = Math.max(0, Math.min(100, t.pos-10));
        const width = Math.max(6, t.speed*20);

        const color = t.type==="Freight"?"#f97316":(t.type==="Express"?"#2563eb":"#10b981");  //oranege // blue //greeen
        return (
          <div key={t.id} className="gantt-row">
            <div className="gantt-label">{t.id}</div>
            <div className="gantt-track">
              <div className="gantt-bar" style={{left:left+"%", width:width+"%", background:color}}></div>
            </div>
            <div className="muted" style={{width:70,textAlign:"right"}}>{t.type}</div>
          </div>
        );
      })}
    </div>
  );
}


// Real-time Schedule page — shows only the Train Schedule section
function RealTimeSchedulePage({ trains }) {
  return (
    <main className="content">
      {/* Left column: the schedule card */}
      <section>
        <div className="card">
          <h3>Real-time Train Schedule</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            Live schedule for the section — updated in real-time.
          </div>

          {/* Reuse your existing TrainTable component */}
          <TrainTable trains={trains} />
        </div>
      </section>

      {/* Right column: optional quick actions / info */}
      <aside className="sidebar-right">
        <div className="card">
          <h3>Quick Filters</h3>
          <div className="muted">Add filters (by type, delay) and export here.</div>
        </div>

        <div className="card">
          <h3>About Schedule</h3>
          <div className="muted">This view focuses only on the schedule table and tools for controllers.</div>
        </div>
      </aside>
    </main>
  );
}


// AI Scheduling page — shows only the AI suggestions (Recommendations)
function AISchedulingPage({ recs }) {
  return (
    <main className="content">
      <section style={{ maxWidth: 900 }}>
        <div className="card">
          <h3>AI Scheduling Suggestions</h3>
          <div className="muted" style={{ marginBottom: 10 }}>
            These are AI-driven conflict resolution and scheduling recommendations.
          </div>
          <Recommendations
            recs={recs}
            onApply={(r) => alert("Applied: " + r.reason)}
            onModify={(r) => alert("Modify " + r.holdTrain)}
            onOverride={(r) => alert("Override AI for " + r.holdTrain)}
          />
        </div>
      </section>

      <aside className="sidebar-right">
        <div className="card">
          <h3>How AI Helps</h3>
          <div className="muted">
            AI suggests re-ordering trains to reduce conflicts.  
            Controllers can apply, modify, or override recommendations.
          </div>
        </div>
      </aside>
    </main>
  );
}


// About Us page — shows full description + team + contact
function AboutUsPage() {
  return (
    <main className="content">
      {/* Left: Main description */}
      <section style={{ maxWidth: 900 }}>
        <div className="card">
          <h3>About RailOptima</h3>
          <div className="muted" style={{ lineHeight: "1.6" }}>
            RailOptima is a smart decision-support platform designed for Indian Railways section controllers. 
            It brings together real-time train movement, predictive scheduling, and AI-driven conflict resolution 
            into one dashboard. The system helps minimize delays, optimize throughput, and improve passenger 
            & freight coordination. Our goal is to empower controllers with actionable insights instead of raw data. 
            RailOptima is lightweight, intuitive, and adaptable for different sections of the network. With continuous 
            feedback and collaboration, it evolves into a tool that bridges operations and technology seamlessly.  
            Controllers can modify train schedules both manually and through AI assistance.  
            Currently, demo data is being used (later, real train data will be fetched via APIs).
          </div>
        </div>
      </section>

      {/* Right: Team and Contact */}
      <aside className="sidebar-right">
        <div className="card">
          <h3>Admin Team</h3>
          <ul className="muted">
            <li>Anushka Gupta — anushka@railoptima.com</li>
            <li>Himani Vashisht — himani@railoptima.com</li>
          </ul>
        </div>

        <div className="card">
          <h3>Contact Us</h3>
          <div className="muted">
            Email: support@railoptima.com <br />
            Phone: +91-12345-67890
          </div>
        </div>
      </aside>
    </main>
  );
}


// Delay Analytics page — focuses on delay-related insights
function DelayAnalyticsPage({ trains, kpis }) {
  return (
    <main className="content">
      {/* Left side: Delay KPIs and analytics */}
      <section>
        <div className="card">
          <h3>Delay Overview</h3>
          <KPIBlock kpis={kpis} /> {/* Reuse KPI block (shows Avg Delay) */}
        </div>

        <div className="card table">
          <h3>Delayed Trains</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Origin</th><th>Dest</th><th>Delay</th>
              </tr>
            </thead>
            <tbody>
              {trains.filter(t => t.delay > 0).map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.origin}</td>
                  <td>{t.dest}</td>
                  <td>{t.delay} min</td>
                </tr>
              ))}
              {trains.filter(t => t.delay > 0).length === 0 && (
                <tr><td colSpan="4">No delays currently 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Delay Timeline</h3>
          <Gantt trains={trains} /> {/* Reuse existing Gantt visualization */}
        </div>
      </section>

      {/* Right side: Insights */}
      <aside className="sidebar-right">
        <div className="card">
          <h3>Insights</h3>
          <div className="muted">
            AI highlights which trains or sections cause the most delay.  
            Use this to proactively manage congestion and reschedule.  
          </div>
        </div>
        <div className="card">
          <h3>Reports</h3>
          <div className="muted">
            Export delay analysis as PDF/CSV for higher officials.  
            (Coming soon 🚀)
          </div>
        </div>
      </aside>
    </main>
  );
}

// Reports page — summaries, logs, and export options
function ReportsPage({ trains, recs, kpis }) {
  return (
    <main className="content">
      {/* Left side: Performance summary and logs */}
      <section>
        <div className="card">
          <h3>Performance Summary</h3>
          <div className="muted">Overview of today’s operations</div>
          <ul style={{ marginTop: 10, lineHeight: "1.6" }}>
            <li>Throughput: {kpis.throughput}%</li>
            <li>Average Delay: {kpis.avgDelay} min</li>
            <li>Total Trains in Section: {kpis.inSection}</li>
            <li>AI Suggestions Generated: {recs.length}</li>
          </ul>
        </div>

        <div className="card table">
          <h3>Train Log (Demo)</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Origin</th><th>Dest</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trains.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.origin}</td>
                  <td>{t.dest}</td>
                  <td>{t.delay > 0 ? `${t.delay} min delay` : "On Time"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right side: exports and AI summary */}
      <aside className="sidebar-right">
        <div className="card">
          <h3>Export Reports</h3>
          <div className="muted">Download operations data:</div>
          <button className="btn btn-primary" style={{ marginTop: 8 }}>
            Export as PDF
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 6 }}>
            Export as CSV
          </button>
        </div>

        <div className="card">
          <h3>AI Decisions Summary</h3>
          <div className="muted">
            Track how many AI suggestions were applied, modified, or overridden.  
            (Feature coming soon 🚀)
          </div>
        </div>
      </aside>
    </main>
  );
}



function HeadingBar() {
  return (
    <div className="heading-bar">
      RailOptima – Real-time Train Traffic Control
    </div>
  );
}

/* ----- Main App ----- */
function App() {
  const [trains,setTrains] = useState(initialTrains);
  const [recs,setRecs] = useState([]);
  const [kpis,setKpis] = useState(computeKPIs(initialTrains));
  const [activePage, setActivePage] = useState("Dashboard"); // NEW

  useEffect(()=>{
    const timer = setInterval(()=>{
      setTrains(prev=>{
        const updated = prev.map(t=>{
          let pos = t.pos + t.speed*1.5;
          if(pos>100) pos-=100;
          return {...t,pos};
        });
        setRecs(generateRecommendations(updated));
        setKpis(computeKPIs(updated));
        return updated;
      });
    },1200);
    return ()=>clearInterval(timer);
  },[]);

  return (
    <div className="app">
      {/* pass activePage and setter to Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Keep topbar and heading visible */}
      <Topbar />
      <HeadingBar />

      {/* Conditional rendering of the main area */}
      {activePage === "Dashboard" && (
        <main className="content">
          <section>
            <TrainMap trains={trains} onSelect={t=>alert(`Train ${t.id}\nDelay: ${t.delay} min`)} />
            <KPIBlock kpis={kpis}/>
            <TrainTable trains={trains}/>
            <Gantt trains={trains}/>
          </section>
          <aside className="sidebar-right">
            <Recommendations
              recs={recs}
              onApply={r=>alert("Applied: "+r.reason)}
              onModify={r=>alert("Modify "+r.holdTrain)}
              onOverride={r=>alert("Override AI for "+r.holdTrain)}
            />
            <div className="card">
              <h3>About RailOptima</h3>
              <div className="muted">AI decision-support dashboard for Indian Railways section controllers.</div>
            </div>
          </aside>
        </main>
      )}

      {activePage === "Real-time Schedule" && (
        <RealTimeSchedulePage trains={trains} />
      )}

      {activePage === "AI Scheduling" && (
      <AISchedulingPage recs={recs} />
       )}
     
     {activePage === "About Us" && (
  <AboutUsPage />
)}

{activePage === "Delay Analytics" && (
  <DelayAnalyticsPage trains={trains} kpis={kpis} />
)}

{activePage === "Reports" && (
  <ReportsPage trains={trains} recs={recs} kpis={kpis} />
)}

      


      {/* (Later add conditions for other pages) */}
    </div>
  );
}


/* ----- Render App ----- */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
