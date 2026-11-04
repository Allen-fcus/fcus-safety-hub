              key={i}
              className="bg-white rounded-md p-3 border"
              style={{ borderColor: p.pinned ? GOLD : "#E4E2DA", borderLeftWidth: p.pinned ? 3 : 1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {p.pinned && <Pin size={12} color={GOLD} />}
                  <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{p.title}</div>
                </div>
                <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{p.date}</span>
              </div>
              <div className="text-[12px]" style={{ color: "#333" }}>{p.message}</div>
              {p.videoUrl && (
                <video src={p.videoUrl} controls playsInline preload="metadata" className="w-full rounded-md mt-2" style={{ background: "#000", aspectRatio: "16 / 9" }} />
              )}
              {p.checklist && p.checklist.length > 0 && (
                <div className="mt-2 space-y-1">
                  {p.checklist.map((item, ci) => (
                    <div key={ci} className="flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
                      <span className="text-[11px] leading-snug" style={{ color: "#333" }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <LifesavingControlsCard />
          {latestWeek && latestWeek.talks.length > 0 && (user && user.sessionToken ? (
            <div className="md:col-span-2">
              <div className="text-[9px] uppercase font-bold mb-1" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Toolbox Talk of the week</div>
              <ToolboxWeekCard week={latestWeek} user={user} latest expanded={weekOpen} onToggle={() => setWeekOpen((v) => !v)} />
            </div>
          ) : latestWeek && (
            <button onClick={() => go("toolbox")} className="md:col-span-2 w-full text-left bg-white rounded-md p-3 border" style={{ borderColor: GOLD, borderLeftWidth: 3 }}>
              <div className="text-[9px] uppercase font-bold inline-block px-1.5 py-0.5 rounded-sm mb-1" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>Toolbox Talk of the week</div>
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{latestWeek.week_label}</div>
              <div className="mt-1 space-y-0.5">{latestWeek.talks.map((tk, ti) => <div key={ti} className="text-[12px]" style={{ color: "#333" }}>{tk.title}</div>)}</div>
              <div className="text-[10px] font-bold uppercase mt-1.5" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Log in to open</div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.06em" }}>
