# Philosophy
To Do lists can be highly useful tools but they often end up in an unmanageable state. There are many reasons for this but it's partly because capturing tasks outpaces the ability to complete them.
When this happens, a to do list shifts from increasing our efficiency to drawing from it due to an ever increasing need to maintain it.
When we surpass this point, we find ourselves in a death grip with our own to do list because actual mission critical items are contained within it, but we must submit ourselves to the maintenance in order to find them in the noise.
In parallel to these pitfalls, To do lists are static. At best they reflect what matters in the moment we recorded the task or the moment we prioritized the list. As we expend attention on the maintenance of the list, we withdraw from the environmental and social cues that help us to focus on what matters rather than what was prioritized at an arbitrary time.

When we don't work with a to do list, we work organically. This means constantly being in touch with our environment and the people around us to have a constant grasp on what really matters moment to moment. This way of working is more fluid and adaptable to change. However, they run into limitations with our ability to hold things in memory. Often the work to be done contains important and granular detail or we enter periods where work becomes intense. The organic approach allows us to move quickly and adapt but it can result in forgetting information not because it's unimportant but because there is simply too much of it.

# Tides over sand
This project is an exploration into what it might look like to merge the two approaches. We imagine someone on the beach writing their to do list in sand with a stick. The sand is still wet from high tide and holds the information well. The writer knows once the tide cycles again, the sand will only hold the writing partially. If they think the writing should stay, they can opt to trace the faint lines again to extend the lifetime of the task in their system. Importantly, the alternative of disappearance is default and expected behavior.

# Creating the application
Now we get to what we are going to build here. This application will be a functional POC with a modern yet minimalist design. It will operate like a standard to do list but will incorporate the tides over sand approach as follows:

- The lifetime of each task is five days.
- At the end of lifetime, the task disappears forever. It does not get archived. It's gone forever. We want to embrace letting go.
- Visually, the task will appear to fade away as it gets closer to the end of its lifetime. Each day it becomes increasingly faint.
- On the fourth day, it should be its faintest but still readable.
- Tasks can be "renewed" to reset their lifetime. So the "renewal date" refers to the date it was renewed or the creation date if it was never renewed.
- The sort ordering of tasks is a fixed rule. Most recent renewal date first.
- The way a user renews a task is by dragging it to be before any other task.
- When the task is renewed, the renewal date it is given is equal to one day before the tasks it is force-ranked before.
- If the renewed task it is force-ranked before was created today, the renewal date is today.
- If the renewed task is the only task in the list, only then will we see a special "renew" button in the task details that resets the task's renewal date to today.
- If a task is completed, it is crossed out but remains visible to keep true to the metaphor of writing in sand on the beach.
- Completed tasks fade away the same way as any other task except they cannot be renewed.
- Completed tasks can be unmarked as completed only within a minute of the time they were completed.
- You can still click to see the details of a completed task.

## Design
- Use the design of Things 3 as inspiration.
- In the list view of tasks, each row shows:
    - A checkbox to complete the task.
    - The title of the task
- Clicking on the task row (unless to check the box) reveals a task detail view with the following information:
    - Title
    - Markdown body (no HTML preview, always markdown)
        - Some syntax highlighting available here when not in edit mode, mainly bolding headings and strong text and italicizing emphasized text.
    - Lifetime value expressed in number of days old. E.g. Lifetime 3d
      - Next to lifetime value a link called "Renew" to set to 0d.
    - Again, refer to how Things 3 lays out and styles their task detail view and try to match the overall idea.

## Software design
- No software design decision should preclude this from working in Github pages without dependencies on other platforms or systems like a MySQL database hosted elsewhere.
- Many different people can use this application without mixing their to do list information. This will work by generating a unique identifier as a URL parameter upon loading.
- The list created will be tied to the identifier in the url parameter.
- If a user visits with an ID in that url parameter which does not line up with any known data, we will quietly create that row of data associated to that ID as we would on a new page load.
- If there are any problems with these design requirements that prevent the agent from completing these tasks, the agent should stop and alert to the issue before proceeding.