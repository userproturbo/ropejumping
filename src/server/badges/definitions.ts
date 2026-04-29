import { BadgeCategory } from "@/generated/prisma/enums";

export type AutomaticBadgeDefinition = {
  category: BadgeCategory;
  code: string;
  description: string;
  name: string;
  threshold: number;
  type: "participation" | "objects" | "height";
};

export const automaticBadgeDefinitions = [
  {
    code: "participation_first",
    name: "Первый прыжок",
    description: "1 подтверждённое участие.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 1,
  },
  {
    code: "participation_5",
    name: "В теме",
    description: "5 подтверждённых участий.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 5,
  },
  {
    code: "participation_10",
    name: "Свой человек",
    description: "10 подтверждённых участий.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 10,
  },
  {
    code: "participation_25",
    name: "Постоянный участник",
    description: "25 подтверждённых участий.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 25,
  },
  {
    code: "participation_50",
    name: "Живёт этим",
    description: "50 подтверждённых участий.",
    category: BadgeCategory.PARTICIPATION,
    type: "participation",
    threshold: 50,
  },
  {
    code: "objects_first",
    name: "Новый горизонт",
    description: "1 уникальный объект в подтверждённых участиях.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 1,
  },
  {
    code: "objects_3",
    name: "Исследователь",
    description: "3 уникальных объекта в подтверждённых участиях.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 3,
  },
  {
    code: "objects_5",
    name: "Открывает новые места",
    description: "5 уникальных объектов в подтверждённых участиях.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 5,
  },
  {
    code: "objects_10",
    name: "Путешественник",
    description: "10 уникальных объектов в подтверждённых участиях.",
    category: BadgeCategory.OBJECTS,
    type: "objects",
    threshold: 10,
  },
  {
    code: "height_30",
    name: "Первый уровень",
    description: "Подтверждённое участие на объекте высотой от 30 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 30,
  },
  {
    code: "height_50",
    name: "Выше страха",
    description: "Подтверждённое участие на объекте высотой от 50 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 50,
  },
  {
    code: "height_100",
    name: "Сотка",
    description: "Подтверждённое участие на объекте высотой от 100 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 100,
  },
  {
    code: "height_150",
    name: "Граница",
    description: "Подтверждённое участие на объекте высотой от 150 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 150,
  },
  {
    code: "height_200",
    name: "Высота",
    description: "Подтверждённое участие на объекте высотой от 200 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 200,
  },
  {
    code: "height_300",
    name: "Свободное падение",
    description: "Подтверждённое участие на объекте высотой от 300 м.",
    category: BadgeCategory.HEIGHT,
    type: "height",
    threshold: 300,
  },
] satisfies AutomaticBadgeDefinition[];
