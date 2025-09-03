const members = [
  {
    name: "Ashutosh Mittal",
    role: "Tabs over Spaces Advocate",
    avatar:
      "https://pbs.twimg.com/profile_images/1829612083362873345/mWvpzQN3_400x400.jpg",
    x: "https://x.com/AashutoshMitta9",
    github: "https://github.com/aashu1412",
  },
  {
    name: "Ayush Kansal",
    role: "Merge Conflict Survivor",
    avatar: "https://avatars.githubusercontent.com/u/108950402?v=4",
    x: "https://x.com/aykansal",
    github: "https://github.com/aykansal",
  },
];

export default function TeamSection() {
  return (
    <section className="py-12 md:py-32">
      <div className="mx-auto max-w-3xl px-8 lg:px-0">
        <h2 className="mb-8 text-4xl font-bold md:mb-16 lg:text-5xl">
          Who cooked this up?
        </h2>
        <div className="grid grid-cols-2 gap-4 border-t py-6 md:grid-cols-4">
          {members.map((member, index) => (
            <div key={index}>
              <div className="bg-background size-20 rounded-full border p-0.5 shadow shadow-zinc-950/5">
                <img
                  className="aspect-square rounded-full object-cover"
                  src={member.avatar}
                  alt={member.name}
                  height="460"
                  width="460"
                  loading="lazy"
                />
              </div>
              <span className="mt-2 block text-sm">{member.name}</span>
              <span className="text-muted-foreground block text-xs">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
