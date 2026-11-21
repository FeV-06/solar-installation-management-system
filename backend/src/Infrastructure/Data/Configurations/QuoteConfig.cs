using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class QuoteConfig : IEntityTypeConfiguration<Quote>
{
    public void Configure(EntityTypeBuilder<Quote> builder)
    {
        builder.ToTable("quotes");
        builder.HasKey(q => q.Id).HasName("pk_quotes");

        builder.Property(q => q.Id).HasColumnName("id");
        builder.Property(q => q.InstallationId).HasColumnName("installation_id");
        builder.Property(q => q.SystemCapacityKw).HasColumnName("system_capacity_kw").HasPrecision(5, 2);
        builder.Property(q => q.SystemType).HasColumnName("system_type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(q => q.BasePriceRupees).HasColumnName("base_price_rupees").HasPrecision(12, 2);
        builder.Property(q => q.EstimatedSubsidyRupees).HasColumnName("estimated_subsidy_rupees").HasPrecision(12, 2);
        builder.Property(q => q.TotalAmountRupees).HasColumnName("total_amount_rupees").HasPrecision(12, 2);
        builder.Property(q => q.AdvancePercentage).HasColumnName("advance_percentage").HasPrecision(5, 2);
        builder.Property(q => q.AdvanceRequiredRupees).HasColumnName("advance_required_rupees").HasPrecision(12, 2);
        builder.Property(q => q.AmountPaidRupees).HasColumnName("amount_paid_rupees").HasPrecision(12, 2);
        builder.Property(q => q.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(q => q.PaymentStatus).HasColumnName("payment_status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(q => q.Notes).HasColumnName("notes").HasMaxLength(2000);
        builder.Property(q => q.PaymentReference).HasColumnName("payment_reference").HasMaxLength(100);
        builder.Property(q => q.CreatedAt).HasColumnName("created_at");
        builder.Property(q => q.SentAt).HasColumnName("sent_at");
        builder.Property(q => q.AcceptedAt).HasColumnName("accepted_at");
        builder.Property(q => q.PaidAt).HasColumnName("paid_at");

        builder.HasIndex(q => q.InstallationId).HasDatabaseName("ix_quotes_installation_id");
        builder.HasIndex(q => q.Status).HasDatabaseName("ix_quotes_status");

        builder.HasOne(q => q.Installation)
            .WithMany(i => i.Quotes)
            .HasForeignKey(q => q.InstallationId)
            .HasConstraintName("fk_quotes_installations_installation_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(q => q.Items)
            .WithOne(i => i.Quote)
            .HasForeignKey(i => i.QuoteId)
            .HasConstraintName("fk_quote_items_quotes_quote_id")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
