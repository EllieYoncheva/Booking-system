/**
 * Catalog + sample classes only. App users are created on first Keycloak JWT (findOrCreate).
 * @param {import("knex").Knex} knex
 */
export async function seed(knex) {
  await knex("Notifications").del();
  await knex("Waitlist").del();
  await knex("Reservations").del();
  await knex("Classes").del();
  await knex("Studios").del();
  await knex("Services").del();
  await knex("Instructors").del();

  const [studioId] = await knex("Studios").insert({
    name: "Downtown Pilates",
    country: "US",
    city: "New York",
    address: "100 Studio Lane",
    phone: "+1-555-0100",
    email: "hello@downtown-pilates.example",
  });

  const [serviceId] = await knex("Services").insert({
    name: "Reformer Group",
    description: "55-minute reformer class",
    duration: 55,
  });

  const [instructorId] = await knex("Instructors").insert({
    firstName: "Alex",
    lastName: "Rivera",
    phone: "+1-555-0200",
    email: "alex@downtown-pilates.example",
  });

  const now = new Date();
  const day = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const rows = [
    {
      name: "Morning Reformer",
      description: "All levels welcome",
      startsAt: day(1),
      endsAt: new Date(day(1).getTime() + 55 * 60 * 1000),
      price: 35.0,
      capacity: 8,
      serviceId,
      studioId,
      instructorId,
    },
    {
      name: "Evening Reformer",
      description: "Intermediate",
      startsAt: day(2),
      endsAt: new Date(day(2).getTime() + 55 * 60 * 1000),
      price: 35.0,
      capacity: 6,
      serviceId,
      studioId,
      instructorId,
    },
    {
      name: "Weekend Flow",
      description: "Beginner friendly",
      startsAt: day(5),
      endsAt: new Date(day(5).getTime() + 55 * 60 * 1000),
      price: 40.0,
      capacity: 10,
      serviceId,
      studioId,
      instructorId,
    },
  ];

  await knex("Classes").insert(rows);
}
