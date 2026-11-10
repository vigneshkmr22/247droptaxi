// Customer reviews copied word for word from the Google Business Profile of Geodest Tours and Travels (5 stars each).
// Never edit a customer's wording; add or remove whole reviews only.
export interface Review {
  name: string;
  rating: number;
  text: string;
}

export const GOOGLE_REVIEWS: Review[] = [
  {
    name: 'Karupa samy', rating: 5,
    text: 'A taxi service with the best rating in Chennai. For my aunt and uncle, we have reserved a taxi from Chennai to Trichy. It was a safe trip. Drivers were fully vaccinated and aware of the threat. Drivers wore masks throughout their travel. These old people were then checked for their identity and comfort by the driver. The cost of the trip is fair. Car speed is accurate to help travelers feel relaxed. Thank you for your excellent service. We recommend you to everyone.',
  },
  { name: 'Ram Prasath', rating: 5, text: 'Good Service arranged by Geodest... Driver was very polite and reasonable price from Chennai to Villupuram' },
  {
    name: 'Niranjani Nisha', rating: 5,
    text: "I could always rely on their service, which makes me be at ease whenever i travel. I am also delighted with their straight forward approach and affordable pay for long distance journey. I would suggest people to take-in this travel without a second taught!! Kudos for upcoming journey's",
  },
  { name: 'Mukesh Kumaran', rating: 5, text: 'Very reasonable price and Excellent service. Cab was well maintained.very friendly and adjustable driver ( Mr.Vignesh). Best place to book for family trips.' },
  {
    name: 'siraj deen', rating: 5,
    text: 'Approached Geodest for travel plan. Got quick response and acknowledgement to the request. Although, it was a last minute request, they arranged the vehicle and provided a good service. Would recommend for any travel plan.',
  },
  { name: 'sudha priya', rating: 5, text: "Excellent service. Driver was on time and very helpful.I'll highly recommending to anyone needing service in geodest" },
  {
    name: 'Bhakthi priya', rating: 5,
    text: 'Hi i am priya, so happy to share my experience with geodest tours and travels. I used this service 4to 6 times. They always give professional service. On time, covid prevention i, s full sanitation drive warning mask, and mostly all divers are very friendly helping nature. I give 10/10 rating. And most importantly I like to thank them for pricing. Awesome packages they give us depending upon our needs. Thank you so much 😊',
  },
  { name: 'selva rani', rating: 5, text: 'Very good service at best price. Driving is smooth and Management is so professional.. Over all satisfied with their ambiance in a nice way.' },
  { name: 'Gopalakrishnan M', rating: 5, text: 'Very friendly and polite organizers, and also neat and safety cabs adjusting customers requirements at a valid pricing.' },
];
