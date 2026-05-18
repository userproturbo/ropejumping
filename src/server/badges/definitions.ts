import { BadgeCategory } from "@/generated/prisma/enums";

export type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  isManual?: boolean;
};

export type AutomaticBadgeDefinition = BadgeDefinition & {
  threshold: number;
  type: "participation" | "objects" | "height";
};

export const automaticBadgeDefinitions = [
  {
    code: "participation_1",
    name: "Первый прыжок",
    description: "Первое подтверждённое участие в мероприятии.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 1,
  },
  {
    code: "participation_2",
    name: "Вернулся снова",
    description: "2 подтверждённых участия в мероприятиях.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 2,
  },
  {
    code: "participation_5",
    name: "В теме",
    description: "5 подтверждённых участий в мероприятиях.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 5,
  },
  {
    code: "participation_10",
    name: "Свой человек",
    description: "10 подтверждённых участий в мероприятиях.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 10,
  },
  {
    code: "participation_25",
    name: "Постоянный участник",
    description: "25 подтверждённых участий в мероприятиях.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 25,
  },
  {
    code: "participation_50",
    name: "Живёт этим",
    description: "50 подтверждённых участий в мероприятиях.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 50,
  },
  {
    code: "objects_1",
    name: "Первый объект",
    description: "Первый публичный объект в подтверждённой истории участия.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 1,
  },
  {
    code: "objects_3",
    name: "География начинается",
    description: "3 публичных объекта в подтверждённой истории участия.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 3,
  },
  {
    code: "objects_5",
    name: "Пять объектов",
    description: "5 публичных объектов в подтверждённой истории участия.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 5,
  },
  {
    code: "objects_10",
    name: "Исследователь объектов",
    description: "10 публичных объектов в подтверждённой истории участия.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 10,
  },
  {
    code: "height_30",
    name: "30+",
    description: "Подтверждённое участие на объекте высотой 30+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 30,
  },
  {
    code: "height_50",
    name: "50+",
    description: "Подтверждённое участие на объекте высотой 50+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 50,
  },
  {
    code: "height_100",
    name: "100+",
    description: "Подтверждённое участие на объекте высотой 100+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 100,
  },
  {
    code: "height_150",
    name: "150+",
    description: "Подтверждённое участие на объекте высотой 150+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 150,
  },
  {
    code: "height_200",
    name: "200+",
    description: "Подтверждённое участие на объекте высотой 200+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 200,
  },
  {
    code: "height_300",
    name: "300+",
    description: "Подтверждённое участие на объекте высотой 300+ м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 300,
  },
] satisfies AutomaticBadgeDefinition[];
