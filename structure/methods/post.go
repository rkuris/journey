package methods

import (
	"log"

	"github.com/kabukky/journey/database"
	"github.com/kabukky/journey/date"
	"github.com/kabukky/journey/structure"
)

func SavePost(p *structure.Post) error {
	tagIds := make([]int64, 0)
	// Insert tags
	for _, tag := range p.Tags {
		// Tag slug might already be in database
		tagId, err := database.RetrieveTagIDBySlug(tag.Slug)
		if err != nil {
			// Tag is probably not in database yet
			tagId, err = database.InsertTag(tag.Name, tag.Slug, date.GetCurrentTime(), p.Author.ID)
			if err != nil {
				return err
			}
		}
		if tagId != 0 {
			tagIds = append(tagIds, tagId)
		}
	}
	// Insert post
	postId, err := database.InsertPost(p.Title, p.Slug, p.Markdown, p.HTML, p.IsFeatured, p.IsPage, p.IsPublished, p.MetaDescription, p.Image, *p.Date, p.Author.ID)
	if err != nil {
		return err
	}
	// Insert postTags
	for _, tagId := range tagIds {
		err = database.InsertPostTag(postId, tagId)
		if err != nil {
			return err
		}
	}
	// Generate new global blog
	err = GenerateBlog()
	if err != nil {
		log.Panic("Error: couldn't generate blog data:", err)
	}
	return nil
}

func UpdatePost(p *structure.Post) error {
	tagIds := make([]int64, 0)
	// Insert tags
	for _, tag := range p.Tags {
		// Tag slug might already be in database
		tagId, err := database.RetrieveTagIDBySlug(tag.Slug)
		if err != nil {
			// Tag is probably not in database yet
			tagId, err = database.InsertTag(tag.Name, tag.Slug, date.GetCurrentTime(), p.Author.ID)
			if err != nil {
				return err
			}
		}
		if tagId != 0 {
			tagIds = append(tagIds, tagId)
		}
	}
	// Update post
	err := database.UpdatePost(p.ID, p.Title, p.Slug, p.Markdown, p.HTML, p.IsFeatured, p.IsPage, p.IsPublished, p.MetaDescription, p.Image, *p.Date, p.Author.ID)
	if err != nil {
		return err
	}
	// Delete old postTags
	err = database.DeletePostTagsForPostID(p.ID)
	// Insert postTags
	if err != nil {
		return err
	}
	for _, tagId := range tagIds {
		err = database.InsertPostTag(p.ID, tagId)
		if err != nil {
			return err
		}
	}
	// Generate new global blog
	err = GenerateBlog()
	if err != nil {
		log.Panic("Error: couldn't generate blog data:", err)
	}
	return nil
}

func DeletePost(postId int64) error {
	err := database.DeletePostByID(postId)
	if err != nil {
		return err
	}
	// Generate new global blog
	err = GenerateBlog()
	if err != nil {
		log.Panic("Error: couldn't generate blog data:", err)
	}
	return nil
}
