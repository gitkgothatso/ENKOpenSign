const userssetting = [
  {
    icon: "fa-light fa-users fa-fw",
    title: "Users",
    target: "_self",
    pageType: "",
    description: "",
    objectId: "users"
  }
];
export const subSetting = [
  {
    icon: "fa-light fa-sliders",
    title: "Preferences",
    target: "_self",
    pageType: "",
    description: "",
    objectId: "preferences"
  },
  ...userssetting
];

const sidebarList = [
  {
    icon: "fa-light fa-tachometer-alt",
    title: "Dashboard",
    target: "",
    pageType: "",
    description: "",
    objectId: "documents"
  },
  {
    icon: "fa-light fa-newspaper",
    title: "Templates",
    target: "_self",
    pageType: "",
    description: "",
    objectId: "templates"
  },
  {
    icon: "fa-light fa-address-book",
    title: "Contactbook",
    target: "_self",
    pageType: "",
    description: "",
    objectId: "contacts"
  },
  {
    icon: "fa-light fa-cog",
    title: "Settings",
    target: "_self",
    pageType: null,
    description: "",
    objectId: null,
    children: [
      {
        icon: "fa-light fa-pen-fancy",
        title: "My Signature",
        target: "_self",
        pageType: "",
        description: "",
        objectId: "managesign"
      },
      {
        icon: "fa-light fa-key",
        title: "API Token",
        target: "_self",
        pageType: "",
        description: "",
        objectId: "generatetoken"
      },
      {
        icon: "fa-light fa-globe",
        title: "Webhook",
        target: "_self",
        pageType: "",
        description: "",
        objectId: "webhook"
      }
    ]
  }
];
export default sidebarList;
