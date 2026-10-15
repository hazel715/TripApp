import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  api,
  type User,
  type Project,
  type Category,
  type Expense,
  type Burden,
  type Final,
} from "./api.ts";
import { ExpenseForm } from "./ExpenseForm.tsx";
import "./style.css";
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState<Project | null>(null),
    [categories, setCategories] = useState<Category[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [burden, setBurden] = useState<Burden[]>([]),
    [final, setFinal] = useState<Final[] | null>(null),
    [dirty, setDirty] = useState(false),
    [editor, setEditor] = useState<Expense | null | false>(false);
  const [name, setName] = useState(""),
    [defaultCurrency, setDefaultCurrency] = useState("KRW"),
    [settlementCurrency, setSettlementCurrency] = useState("KRW"),
    [memberEmail, setMemberEmail] = useState(""),
    [memberName, setMemberName] = useState(""),
    [role, setRole] = useState("member"),
    [categoryName, setCategoryName] = useState("");
  const init = useRef(false);
  async function run(fn: () => Promise<void>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function list() {
    setProjects(await api<Project[]>("/projects"));
  }
  async function load(id: string) {
    const [p, c, e, b] = await Promise.all([
      api<Project>(`/projects/${id}`),
      api<Category[]>("/categories"),
      api<Expense[]>(`/projects/${id}/expenses`),
      api<Burden[]>(`/projects/${id}/balances`),
    ]);
    setProject(p);
    setCategories(c);
    setExpenses(e);
    setBurden(b);
    setFinal(null);
    setDirty(false);
  }
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    void (async () => {
      const token = new URL(location.href).searchParams.get("token");
      try {
        if (token) {
          await api("/auth/verify", "POST", { token });
          history.replaceState({}, "", "/");
        }
        const me = await api<User>("/auth/me");
        setUser(me);
        await list();
      } catch (e) {
        if (token) setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (!project) return;
    const events = new EventSource(`/api/projects/${project.id}/events`, {
      withCredentials: true,
    });
    events.addEventListener("project.changed", () => setDirty(true));
    return () => events.close();
  }, [project?.id]);
  const display = (id: string) =>
    project?.members.find((m) => m.userId === id)?.displayName ??
    `과거 멤버 ${id.slice(0, 8)}`;
  if (loading)
    return (
      <main>
        <p>불러오는 중…</p>
      </main>
    );
  return (
    <>
      <header>
        <strong>공동 정산</strong>
        <span>함께 쓰고, 정확하게 나누기</span>
        {user && (
          <>
            <button
              onClick={() =>
                void run(async () => {
                  if (project) await load(project.id);
                })
              }
              disabled={!dirty}
            >
              🔔 {dirty ? "데이터 변경됨 · 새로고침" : "최신 데이터"}
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setProject(null);
                  setProjects([]);
                })
              }
            >
              로그아웃
            </button>
          </>
        )}
      </header>
      <main>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {!user ? (
          <section className="panel login">
            <p className="eyebrow">공동 가계부</p>
            <h1>
              여행의 비용을
              <br />
              함께 기록하세요.
            </h1>
            <p>이메일 링크 하나로 시작합니다.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api("/auth/login-link", "POST", { email });
                  setNotice(
                    "로그인 링크를 보냈습니다. 개발 환경에서는 API 서버 로그를 확인하세요.",
                  );
                });
              }}
            >
              <label>
                이메일
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="primary">로그인 링크 받기</button>
            </form>
          </section>
        ) : !project ? (
          <>
            <h1>내 프로젝트</h1>
            <div className="cards">
              {projects.map((p) => (
                <button
                  className="panel project-card"
                  key={p.id}
                  onClick={() => void run(() => load(p.id))}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {p.status} · {p.settlementCurrency}
                  </span>
                </button>
              ))}
            </div>
            <section className="panel">
              <h2>프로젝트 만들기</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const p = await api<Project>("/projects", "POST", {
                      name,
                      defaultExpenseCurrency: defaultCurrency,
                      settlementCurrency,
                    });
                    await list();
                    await load(p.id);
                  });
                }}
              >
                <div className="grid">
                  <label>
                    이름
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    기본 결제 통화
                    <input
                      required
                      pattern="[A-Za-z]{3}"
                      value={defaultCurrency}
                      onChange={(e) =>
                        setDefaultCurrency(e.target.value.toUpperCase())
                      }
                    />
                  </label>
                  <label>
                    기본 정산 통화
                    <input
                      required
                      pattern="[A-Za-z]{3}"
                      value={settlementCurrency}
                      onChange={(e) =>
                        setSettlementCurrency(e.target.value.toUpperCase())
                      }
                    />
                  </label>
                </div>
                <button className="primary">프로젝트 만들기</button>
              </form>
            </section>
          </>
        ) : (
          <>
            <button
              onClick={() =>
                void run(async () => {
                  setProject(null);
                  setEditor(false);
                  setFinal(null);
                  await list();
                })
              }
            >
              ← 프로젝트 목록
            </button>
            <h1>{project.name}</h1>
            <p>
              {project.status} · 결제 기본 {project.defaultExpenseCurrency} ·
              정산 기본 {project.settlementCurrency}
            </p>
            <section className="panel">
              <h2>멤버</h2>
              <ul>
                {project.members.map((m) => (
                  <li key={m.userId}>
                    {m.displayName} · {m.role}{" "}
                    {project.members.some(
                      (x) => x.userId === user.id && x.role === "owner",
                    ) && (
                      <button
                        onClick={() =>
                          void run(async () => {
                            if (
                              confirm(
                                `${m.displayName} 멤버를 제거할까요? 과거 지출은 유지됩니다.`,
                              )
                            ) {
                              await api(
                                `/projects/${project.id}/members/${m.userId}`,
                                "DELETE",
                              );
                              await load(project.id);
                            }
                          })
                        }
                      >
                        제거
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {project.members.some(
                (m) => m.userId === user.id && m.role === "owner",
              ) && (
                <form
                  className="inline"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api(`/projects/${project.id}/members`, "POST", {
                        email: memberEmail,
                        displayName: memberName || undefined,
                        role,
                      });
                      setMemberEmail("");
                      setMemberName("");
                      await load(project.id);
                    });
                  }}
                >
                  <input
                    aria-label="멤버 이메일"
                    placeholder="이메일"
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                  <input
                    aria-label="멤버 표시 이름"
                    placeholder="표시 이름"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                  <select
                    aria-label="역할"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="member">member</option>
                    <option value="owner">owner</option>
                  </select>
                  <button>추가</button>
                </form>
              )}
            </section>
            <section className="panel">
              <h2>지출</h2>
              <button className="primary" onClick={() => setEditor(null)}>
                지출 추가
              </button>
              <form
                className="inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api("/categories", "POST", { name: categoryName });
                    setCategories(await api<Category[]>("/categories"));
                    setCategoryName("");
                  });
                }}
              >
                <input
                  aria-label="전역 카테고리 이름"
                  placeholder="새 전역 카테고리"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
                <button>카테고리 추가</button>
              </form>
              {expenses.length === 0 ? (
                <p>첫 지출을 기록해 보세요.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>날짜 / 설명</th>
                        <th>결제</th>
                        <th>정산 금액</th>
                        <th>결제자</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {e.expenseDate ?? "날짜 미정"}
                            <br />
                            <strong>{e.description}</strong>
                          </td>
                          <td>
                            {e.amount} {e.currency}
                          </td>
                          <td>
                            {e.settlementAmount} {e.settlementCurrency}
                          </td>
                          <td>{display(e.payerUserId)}</td>
                          <td>
                            <button onClick={() => setEditor(e)}>수정</button>
                            <button
                              onClick={() =>
                                void run(async () => {
                                  if (confirm("이 지출을 삭제할까요?")) {
                                    await api(
                                      `/projects/${project.id}/expenses/${e.id}`,
                                      "DELETE",
                                    );
                                    await load(project.id);
                                  }
                                })
                              }
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {editor !== false && (
              <ExpenseForm
                key={`${project.id}-${editor?.id ?? "new"}`}
                project={project}
                categories={categories}
                expense={editor}
                onCancel={() => setEditor(false)}
                onSaved={async () => {
                  setEditor(false);
                  await load(project.id);
                }}
              />
            )}
            <section className="panel">
              <h2>현재 부담 현황</h2>
              <p>
                정산 통화별 참고 현황입니다. 송금 지시가 아닙니다. 차액이 양수면
                받을 금액, 음수면 부담이 더 큰 상태입니다.
              </p>
              {burden.map((group) => (
                <div key={group.currency}>
                  <h3>{group.currency}</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>멤버</th>
                          <th>실제 결제</th>
                          <th>부담</th>
                          <th>차액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.userId}>
                            <td>{display(row.userId)}</td>
                            <td>{row.paid}</td>
                            <td>{row.shareTotal}</td>
                            <td>{row.difference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <button
                className="primary"
                onClick={() =>
                  void run(async () =>
                    setFinal(
                      await api<Final[]>(`/projects/${project.id}/settlement`),
                    ),
                  )
                }
              >
                최종 정산 보기
              </button>
            </section>
            {final && (
              <section className="panel">
                <h2>최종 송금 제안</h2>
                {dirty && (
                  <p>변경 알림이 있습니다. 새로고침 후 다시 계산하세요.</p>
                )}
                {final.map((group) => (
                  <div key={group.currency}>
                    <h3>
                      {group.currency} · 최소 {group.transfers.length}회
                    </h3>
                    {group.transfers.length ? (
                      group.transfers.map((t, index) => (
                        <p key={index}>
                          {display(t.fromUserId)} → {display(t.toUserId)}{" "}
                          <strong>
                            {t.amount} {group.currency}
                          </strong>
                        </p>
                      ))
                    ) : (
                      <p>송금할 금액이 없습니다.</p>
                    )}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
      <footer>공동 비용을 투명하게</footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
