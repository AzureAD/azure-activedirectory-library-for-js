using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace OwinSample.Models
{
    public class TodoItem
    {
        public int TodoItemId { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string UserId { get; set; }
        public bool Completed { get; set; }
    }
}